"use server";

import { revalidatePath } from "next/cache";

import { createPortfolioSchema } from "@/features/finance/schemas";
import type { CreatePortfolioInput } from "@/features/finance/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { parseActionInput } from "@/lib/validation";
import type { FinancePortfolio } from "@/lib/supabase/finance-types";

/**
 * Creates a new investment portfolio for the current user.
 */
export async function createPortfolio(
  input: CreatePortfolioInput,
): Promise<
  { portfolio: FinancePortfolio; error?: undefined } | { portfolio: null; error: string }
> {
  const parsed = parseActionInput(createPortfolioSchema, input);
  if (!parsed.ok) {
    return { portfolio: null, error: parsed.error };
  }

  const name = parsed.data.name;
  const baseCurrency = parsed.data.baseCurrency ?? "EUR";

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
