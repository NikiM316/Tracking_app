"use server";

import { revalidatePath } from "next/cache";

import { nextHoldingPosition } from "@/features/finance/lib/balances";
import {
  getLiveCryptoPrices as fetchLiveCryptoPrices,
  isEthereumHolding,
} from "@/features/finance/lib/crypto-prices";
import type {
  CreateInvestmentTransactionInput,
  CreateSecurityInput,
  HoldingWithDetails,
} from "@/features/finance/types";
import { getTodayDateString, toFiniteNumber } from "@/features/finance/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import type {
  FinanceInvestmentTransaction,
  FinanceSecurity,
} from "@/lib/supabase/finance-types";

/**
 * Fetches the current Ethereum price in EUR from CoinGecko.
 */
export async function getLiveCryptoPrices() {
  return fetchLiveCryptoPrices();
}

/**
 * Inserts a user-scoped security into the catalog (e.g. a custom crypto or stock ticker).
 */
export async function createSecurity(
  input: CreateSecurityInput,
): Promise<{ security: FinanceSecurity; error?: undefined } | { security: null; error: string }> {
  const symbol = input.symbol.trim().toUpperCase();
  const name = input.name.trim() || symbol;
  if (!symbol) {
    return { security: null, error: "Symbol is required." };
  }

  const currency = (input.currency ?? "EUR").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { security: null, error: "Currency must be a 3-letter ISO code (e.g. EUR)." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: security, error } = await supabase
    .from("finance_securities")
    .insert({
      user_id: userId,
      symbol,
      name,
      security_type: input.securityType,
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
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol) {
    return { security: null, error: "Symbol is required." };
  }

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
    name: input.name.trim() || symbol,
    securityType: input.securityType,
    currency: input.currency,
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
  if (input.type !== "buy" && input.type !== "sell") {
    return { transaction: null, error: "Trade type must be buy or sell." };
  }
  const quantity = toFiniteNumber(input.quantity);
  const price = toFiniteNumber(input.price);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { transaction: null, error: "Quantity must be a positive number." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { transaction: null, error: "Price must be zero or greater." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: portfolio, error: portfolioError } = await supabase
    .from("finance_portfolios")
    .select("id, base_currency")
    .eq("id", input.portfolioId)
    .eq("user_id", userId)
    .maybeSingle();

  if (portfolioError) {
    return { transaction: null, error: portfolioError.message };
  }
  if (!portfolio) {
    return { transaction: null, error: "Portfolio not found." };
  }

  const currency =
    (input.currency ?? portfolio.base_currency ?? "EUR").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { transaction: null, error: "Currency must be a 3-letter ISO code (e.g. EUR)." };
  }

  const securityResult = await findOrCreateSecurity({
    symbol: input.symbol,
    name: input.name ?? input.symbol,
    securityType: input.securityType,
    currency,
  });
  if (securityResult.error || !securityResult.security) {
    return { transaction: null, error: securityResult.error ?? "Failed to resolve security." };
  }

  const security = securityResult.security;
  const amount = Number((quantity * price).toFixed(2));
  const tradeDate = input.tradeDate ?? getTodayDateString();

  const { data: existingHolding, error: holdingLookupError } = await supabase
    .from("finance_holdings")
    .select("*")
    .eq("portfolio_id", input.portfolioId)
    .eq("security_id", security.id)
    .maybeSingle();

  if (holdingLookupError) {
    return { transaction: null, error: holdingLookupError.message };
  }

  const previousQuantity = Number(existingHolding?.quantity ?? 0);
  const previousAverageCost = Number(existingHolding?.average_cost ?? 0);

  if (input.type === "sell" && quantity > previousQuantity) {
    return {
      transaction: null,
      error: `Cannot sell ${quantity}; only ${previousQuantity} available.`,
    };
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("finance_investment_transactions")
    .insert({
      user_id: userId,
      portfolio_id: input.portfolioId,
      security_id: security.id,
      type: input.type,
      trade_date: tradeDate,
      quantity,
      price,
      amount,
      currency,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (transactionError || !transaction) {
    return {
      transaction: null,
      error: transactionError?.message ?? "Failed to create investment transaction",
    };
  }

  const { quantity: nextQuantity, averageCost: nextAverageCost } =
    nextHoldingPosition({
      type: input.type,
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
      portfolio_id: input.portfolioId,
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

/**
 * Fetches every investment holding across the current user's portfolios,
 * enriched with portfolio and security details and a live ETH/EUR market value.
 */
export async function getPortfolioHoldings(): Promise<HoldingWithDetails[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const [{ data: portfolios, error: portfoliosError }, prices] = await Promise.all([
    supabase.from("finance_portfolios").select("id, name").eq("user_id", userId),
    fetchLiveCryptoPrices(),
  ]);

  if (portfoliosError) {
    throw new Error(`Failed to fetch portfolios: ${portfoliosError.message}`);
  }

  if (!portfolios || portfolios.length === 0) {
    return [];
  }

  const portfolioIds = portfolios.map((portfolio) => portfolio.id);
  const portfolioNameById = new Map(portfolios.map((portfolio) => [portfolio.id, portfolio.name]));

  const { data: holdings, error: holdingsError } = await supabase
    .from("finance_holdings")
    .select("*")
    .in("portfolio_id", portfolioIds);

  if (holdingsError) {
    throw new Error(`Failed to fetch holdings: ${holdingsError.message}`);
  }

  if (!holdings || holdings.length === 0) {
    return [];
  }

  const securityIds = [...new Set(holdings.map((holding) => holding.security_id))];

  const { data: securities, error: securitiesError } = await supabase
    .from("finance_securities")
    .select("id, symbol, name, security_type")
    .in("id", securityIds);

  if (securitiesError) {
    throw new Error(`Failed to fetch securities: ${securitiesError.message}`);
  }

  const securityById = new Map((securities ?? []).map((security) => [security.id, security]));

  return holdings.map((holding) => {
    const security = securityById.get(holding.security_id);
    const symbol = security?.symbol ?? "?";
    const name = security?.name ?? "Unknown security";
    const quantity = Number(holding.quantity);
    const averageCost = Number(holding.average_cost);
    const isEth = isEthereumHolding(symbol, name);
    const livePriceEur = isEth ? prices.ethereumEur : null;
    const totalInvested = quantity * averageCost;
    const currentValue = livePriceEur != null ? quantity * livePriceEur : null;
    const pnlAmount = currentValue != null ? currentValue - totalInvested : null;
    const pnlPercentage =
      pnlAmount != null && totalInvested > 0 ? (pnlAmount / totalInvested) * 100 : 0;

    return {
      id: holding.id,
      portfolioId: holding.portfolio_id,
      portfolioName: portfolioNameById.get(holding.portfolio_id) ?? "Unknown portfolio",
      securityId: holding.security_id,
      symbol,
      name,
      securityType: security?.security_type ?? "other",
      quantity,
      averageCost,
      currency: holding.currency,
      livePriceEur,
      totalInvested,
      currentValue,
      pnlAmount,
      pnlPercentage: currentValue != null ? pnlPercentage : null,
    };
  });
}
