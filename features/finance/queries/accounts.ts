import "server-only";

import {
  deriveAccountBalances,
  movementsFromCashflowAggregates,
} from "@/features/finance/lib/balances";
import type { AccountWithBalance } from "@/features/finance/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

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

export async function getOwnedAccount(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
): Promise<{ id: string; currency: string; name: string } | null> {
  const { data, error } = await supabase
    .from("finance_accounts")
    .select("id, currency, name")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
