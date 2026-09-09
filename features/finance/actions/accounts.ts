"use server";

import { revalidatePath } from "next/cache";

import { getPlaceholderUserId } from "@/features/finance/lib/server";
import {
  deriveAccountBalances,
  movementsFromCashflowAggregates,
} from "@/features/finance/lib/balances";
import type { AccountWithBalance, CreateAccountInput } from "@/features/finance/types";
import { toFiniteNumber } from "@/features/finance/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FinanceAccount } from "@/lib/supabase/finance-types";

/**
 * Fetches every account for the current user along with its derived balance
 * (opening_balance plus the signed sum of finance_transactions), since
 * balances are never stored directly on finance_accounts.
 *
 * Income/expense are summed in Postgres; only transfer rows are loaded so
 * linked-pair handling can still run in `deriveAccountBalances`.
 */
export async function getAccounts(): Promise<AccountWithBalance[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: accounts, error: accountsError } = await supabase
    .from("finance_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (accountsError) {
    throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
  }

  if (!accounts || accounts.length === 0) {
    return [];
  }

  const [
    { data: cashflowTotals, error: cashflowError },
    { data: transfers, error: transfersError },
  ] = await Promise.all([
    supabase.rpc("finance_cashflow_totals", { p_user_id: userId }),
    supabase
      .from("finance_transactions")
      .select(
        "id, account_id, type, amount, transfer_account_id, transfer_transaction_id, created_at",
      )
      .eq("user_id", userId)
      .eq("type", "transfer"),
  ]);

  if (cashflowError) {
    throw new Error(
      `Failed to fetch cashflow totals for balances: ${cashflowError.message}`,
    );
  }
  if (transfersError) {
    throw new Error(
      `Failed to fetch transfers for balances: ${transfersError.message}`,
    );
  }

  return deriveAccountBalances(accounts, [
    ...movementsFromCashflowAggregates(cashflowTotals ?? []),
    ...(transfers ?? []),
  ]);
}

/**
 * Inserts a new cash/bank account for the current user.
 */
export async function createAccount(
  input: CreateAccountInput,
): Promise<{ account: FinanceAccount; error?: undefined } | { account: null; error: string }> {
  const name = input.name.trim();
  if (!name) {
    return { account: null, error: "Account name is required." };
  }

  const currency = (input.currency ?? "EUR").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { account: null, error: "Currency must be a 3-letter ISO code (e.g. EUR)." };
  }

  const openingBalance = toFiniteNumber(input.openingBalance ?? 0);
  if (!Number.isFinite(openingBalance)) {
    return { account: null, error: "Opening balance must be a number." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: account, error } = await supabase
    .from("finance_accounts")
    .insert({
      user_id: userId,
      name,
      account_type: input.accountType,
      currency,
      opening_balance: openingBalance,
    })
    .select("*")
    .single();

  if (error || !account) {
    return { account: null, error: error?.message ?? "Failed to create account" };
  }

  revalidatePath("/finance");
  return { account };
}
