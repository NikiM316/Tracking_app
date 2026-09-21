"use server";

import { revalidatePath } from "next/cache";

import { createAccountSchema } from "@/features/finance/schemas";
import type { CreateAccountInput } from "@/features/finance/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { parseActionInput } from "@/lib/validation";
import type { FinanceAccount } from "@/lib/supabase/finance-types";

/**
 * Inserts a new cash/bank account for the current user.
 */
export async function createAccount(
  input: CreateAccountInput,
): Promise<{ account: FinanceAccount; error?: undefined } | { account: null; error: string }> {
  const parsed = parseActionInput(createAccountSchema, input);
  if (!parsed.ok) {
    return { account: null, error: parsed.error };
  }

  const { name, accountType, currency: rawCurrency, openingBalance } = parsed.data;
  const currency = rawCurrency ?? "EUR";

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: account, error } = await supabase
    .from("finance_accounts")
    .insert({
      user_id: userId,
      name,
      account_type: accountType,
      currency,
      opening_balance: openingBalance ?? 0,
    })
    .select("*")
    .single();

  if (error || !account) {
    return { account: null, error: error?.message ?? "Failed to create account" };
  }

  revalidatePath("/finance");
  return { account };
}
