"use server";

import { revalidatePath } from "next/cache";

import { nextHoldingPosition } from "@/features/finance/lib/balances";
import {
  createInvestmentTransactionSchema,
  createSecuritySchema,
} from "@/features/finance/schemas";
import type {
  CreateInvestmentTransactionInput,
  CreateSecurityInput,
} from "@/features/finance/types";
import { getTodayDateString } from "@/features/finance/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { parseActionInput } from "@/lib/validation";
import type {
  FinanceInvestmentTransaction,
  FinanceSecurity,
} from "@/lib/supabase/finance-types";

/**
 * Inserts a user-scoped security into the catalog (e.g. a custom crypto or stock ticker).
 */
export async function createSecurity(
  input: CreateSecurityInput,
): Promise<{ security: FinanceSecurity; error?: undefined } | { security: null; error: string }> {
  const parsed = parseActionInput(createSecuritySchema, input);
  if (!parsed.ok) {
    return { security: null, error: parsed.error };
  }

  const symbol = parsed.data.symbol.toUpperCase();
  const name = parsed.data.name?.trim() || symbol;
  const currency = parsed.data.currency ?? "EUR";

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: security, error } = await supabase
    .from("finance_securities")
    .insert({
      user_id: userId,
      symbol,
      name,
      security_type: parsed.data.securityType,
      currency,
    })
    .select("*")
    .single();

  if (error || !security) {
    return { security: null, error: error?.message ?? "Failed to create security" };
  }

  revalidatePath("/finance");
  return { security };
}

async function findOrCreateSecurity(input: CreateSecurityInput): Promise<
  { security: FinanceSecurity; error?: undefined } | { security: null; error: string }
> {
  const parsed = parseActionInput(createSecuritySchema, input);
  if (!parsed.ok) {
    return { security: null, error: parsed.error };
  }

  const symbol = parsed.data.symbol.toUpperCase();
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: existingUserSecurity, error: userLookupError } = await supabase
    .from("finance_securities")
    .select("*")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .maybeSingle();

  if (userLookupError) {
    return { security: null, error: userLookupError.message };
  }
  if (existingUserSecurity) {
    return { security: existingUserSecurity };
  }

  const { data: existingSharedSecurity, error: sharedLookupError } = await supabase
    .from("finance_securities")
    .select("*")
    .is("user_id", null)
    .eq("symbol", symbol)
    .maybeSingle();

  if (sharedLookupError) {
    return { security: null, error: sharedLookupError.message };
  }
  if (existingSharedSecurity) {
    return { security: existingSharedSecurity };
  }

  return createSecurity({
    symbol,
    name: parsed.data.name?.trim() || symbol,
    securityType: parsed.data.securityType,
    currency: parsed.data.currency,
  });
}

/**
 * Logs a buy/sell investment trade. Finds or creates the security by symbol,
 * inserts the investment transaction, then upserts finance_holdings with
 * updated quantity and average cost (weighted average on buys).
 */
export async function createInvestmentTransaction(
  input: CreateInvestmentTransactionInput,
): Promise<
  | {
      transaction: FinanceInvestmentTransaction;
      error?: undefined;
    }
  | { transaction: null; error: string }
> {
  const parsed = parseActionInput(createInvestmentTransactionSchema, input);
  if (!parsed.ok) {
    return { transaction: null, error: parsed.error };
  }

  const {
    portfolioId,
    type,
    symbol,
    name,
    securityType,
    quantity,
    price,
    notes,
  } = parsed.data;

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: portfolio, error: portfolioError } = await supabase
    .from("finance_portfolios")
    .select("id, base_currency")
    .eq("id", portfolioId)
    .eq("user_id", userId)
    .maybeSingle();

  if (portfolioError) {
    return { transaction: null, error: portfolioError.message };
  }
  if (!portfolio) {
    return { transaction: null, error: "Portfolio not found." };
  }

  const currency = parsed.data.currency ?? portfolio.base_currency ?? "EUR";

  const securityResult = await findOrCreateSecurity({
    symbol,
    name: name ?? symbol,
    securityType,
    currency,
  });
  if (securityResult.error || !securityResult.security) {
    return { transaction: null, error: securityResult.error ?? "Failed to resolve security." };
  }

  const security = securityResult.security;
  const amount = Number((quantity * price).toFixed(2));
  const tradeDate = parsed.data.tradeDate ?? getTodayDateString();

  const { data: existingHolding, error: holdingLookupError } = await supabase
    .from("finance_holdings")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .eq("security_id", security.id)
    .maybeSingle();

  if (holdingLookupError) {
    return { transaction: null, error: holdingLookupError.message };
  }

  const previousQuantity = Number(existingHolding?.quantity ?? 0);
  const previousAverageCost = Number(existingHolding?.average_cost ?? 0);

  if (type === "sell" && quantity > previousQuantity) {
    return {
      transaction: null,
      error: `Cannot sell ${quantity}; only ${previousQuantity} available.`,
    };
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("finance_investment_transactions")
    .insert({
      user_id: userId,
      portfolio_id: portfolioId,
      security_id: security.id,
      type,
      trade_date: tradeDate,
      quantity,
      price,
      amount,
      currency,
      notes: notes ?? null,
    })
    .select("*")
    .single();

  if (transactionError || !transaction) {
    return {
      transaction: null,
      error: transactionError?.message ?? "Failed to create investment transaction",
    };
  }

  const { quantity: nextQuantity, averageCost: nextAverageCost } = nextHoldingPosition({
    type,
    quantity,
    price,
    previousQuantity,
    previousAverageCost,
  });

  if (existingHolding) {
    const { error: updateError } = await supabase
      .from("finance_holdings")
      .update({
        quantity: nextQuantity,
        average_cost: nextAverageCost,
        currency,
      })
      .eq("id", existingHolding.id);

    if (updateError) {
      return { transaction: null, error: updateError.message };
    }
  } else {
    const { error: insertError } = await supabase.from("finance_holdings").insert({
      portfolio_id: portfolioId,
      security_id: security.id,
      quantity: nextQuantity,
      average_cost: nextAverageCost,
      currency,
    });

    if (insertError) {
      return { transaction: null, error: insertError.message };
    }
  }

  revalidatePath("/finance");
  return { transaction };
}
