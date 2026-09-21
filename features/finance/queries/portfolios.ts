import "server-only";

import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FinancePortfolio } from "@/lib/supabase/finance-types";

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
