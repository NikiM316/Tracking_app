import "server-only";

import {
  buildMonthActivity,
  type MonthActivity,
} from "@/features/finance/lib/activity";
import {
  currentCalendarMonth,
  isValidStrictCalendarDate,
  type CalendarMonth,
  type DateRange,
} from "@/features/finance/lib/months";
import type { RecentTransaction } from "@/features/finance/types";
import { ISO_DATE_PATTERN } from "@/features/finance/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import type {
  FinanceTransaction,
  FinanceTransactionType,
} from "@/lib/supabase/finance-types";

type TransactionListRow = Pick<
  FinanceTransaction,
  | "id"
  | "type"
  | "amount"
  | "currency"
  | "date"
  | "payee"
  | "notes"
  | "account_id"
  | "category_id"
  | "transfer_account_id"
> & {
  finance_categories?: { name: string } | null;
  account?: { name: string } | null;
  transfer_account?: { name: string } | null;
};

function resolveCategoryName(
  type: FinanceTransactionType,
  categoryId: string | null,
  categoryName: string | null | undefined,
): string {
  if (categoryName?.trim()) {
    return categoryName.trim();
  }
  if (type === "transfer" && !categoryId) {
    return "Transfers";
  }
  return "Uncategorized";
}

function assertIsoCalendarDate(dateString: string, label: string): void {
  if (!ISO_DATE_PATTERN.test(dateString)) {
    throw new Error(`${label} must use YYYY-MM-DD dates.`);
  }
  if (!isValidStrictCalendarDate(dateString)) {
    throw new Error(`${label} is not a valid calendar date: ${dateString}.`);
  }
}

function assertDateRange(range: DateRange): DateRange {
  assertIsoCalendarDate(range.startDate, "Date range start");
  assertIsoCalendarDate(range.endDate, "Date range end");
  if (range.startDate > range.endDate) {
    throw new Error("Date range start must be on or before the end.");
  }
  return range;
}

function toRecentTransaction(
  row: TransactionListRow,
  categoryNameById: Map<string, string>,
  accountNameById: Map<string, string>,
): RecentTransaction {
  const categoryId = row.category_id;
  const joinedCategoryName =
    row.finance_categories?.name ??
    (categoryId ? (categoryNameById.get(categoryId) ?? null) : null);

  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.date,
    payee: row.payee,
    notes: row.notes,
    accountName: row.account?.name ?? accountNameById.get(row.account_id) ?? "Unknown account",
    categoryId,
    categoryName: resolveCategoryName(row.type, categoryId, joinedCategoryName),
    transferAccountName:
      row.transfer_account?.name ??
      (row.transfer_account_id
        ? (accountNameById.get(row.transfer_account_id) ?? null)
        : null),
  };
}

/**
 * Fetches cashflow transactions in `[startDate, endDate]` (inclusive) with a
 * left join onto categories and accounts so orphaned `category_id` values
 * still return a row (displayed as "Uncategorized").
 */
export async function getTransactionsForRange(
  range: DateRange,
): Promise<RecentTransaction[]> {
  const { startDate, endDate } = assertDateRange(range);
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const [
    { data: joinedRows, error: joinedError },
    { data: allCategories },
    { data: allAccounts },
  ] = await Promise.all([
    supabase
      .from("finance_transactions")
      .select(
        `
        *,
        finance_categories ( id, name ),
        account:finance_accounts!account_id ( name ),
        transfer_account:finance_accounts!transfer_account_id ( name )
      `,
      )
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("finance_categories")
      .select("id, name")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    supabase.from("finance_accounts").select("id, name").eq("user_id", userId),
  ]);

  const categoryNameById = new Map(
    (allCategories ?? []).map((category) => [category.id, category.name]),
  );
  const accountNameById = new Map(
    (allAccounts ?? []).map((account) => [account.id, account.name]),
  );

  if (!joinedError && joinedRows) {
    return joinedRows.map((row) =>
      toRecentTransaction(row, categoryNameById, accountNameById),
    );
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (transactionsError) {
    throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
  }

  return (transactions ?? []).map((row) =>
    toRecentTransaction(row, categoryNameById, accountNameById),
  );
}

/**
 * Transactions, total spent, and category breakdown for one calendar month.
 * Totals are derived from the month's rows rather than a second table scan.
 */
export async function getMonthActivity(
  month: CalendarMonth = currentCalendarMonth(),
): Promise<MonthActivity> {
  const transactions = await getTransactionsForRange(month);
  return buildMonthActivity(month, transactions);
}
