"use server";

import { revalidatePath } from "next/cache";

import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import type { CreatePortfolioInput } from "@/features/finance/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FinancePortfolio } from "@/lib/supabase/finance-types";

/**
 * Creates a new investment portfolio for the current user.
 */
export async function createPortfolio(
  input: CreatePortfolioInput,
): Promise<
  { portfolio: FinancePortfolio; error?: undefined } | { portfolio: null; error: string }
> {
  const name = input.name.trim();
  if (!name) {
    return { portfolio: null, error: "Portfolio name is required." };
  }

  const baseCurrency = (input.baseCurrency ?? "EUR").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(baseCurrency)) {
    return { portfolio: null, error: "Currency must be a 3-letter ISO code (e.g. EUR)." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: portfolio, error } = await supabase
    .from("finance_portfolios")
    .insert({
      user_id: userId,
      name,
      base_currency: baseCurrency,
    })
    .select("*")
    .single();

  if (error || !portfolio) {
    return { portfolio: null, error: error?.message ?? "Failed to create portfolio" };
  }

  revalidatePath("/finance");
  return { portfolio };
}

/**
 * Lists the current user's investment portfolios (active first by creation order).
 */
export async function getPortfolios(): Promise<FinancePortfolio[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data, error } = await supabase
    .from("finance_portfolios")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch portfolios: ${error.message}`);
  }

  return data ?? [];
}
