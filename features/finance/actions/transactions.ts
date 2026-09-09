"use server";

import { revalidatePath } from "next/cache";

import { getCategories } from "@/features/finance/actions/categories";
import {
  buildMonthActivity,
  type MonthActivity,
} from "@/features/finance/lib/activity";
import {
  calendarMonthBefore,
  currentCalendarMonth,
  isValidStrictCalendarDate,
  type CalendarMonth,
  type DateRange,
} from "@/features/finance/lib/months";
import { getPlaceholderUserId, getTodayDateString } from "@/features/finance/lib/server";
import type {
  BulkImportTransactionRow,
  CreateTransactionInput,
  RecentTransaction,
  UpdateTransactionData,
} from "@/features/finance/types";
import {
  ISO_DATE_PATTERN,
  parseCategoryId,
  toFiniteNumber,
  UUID_PATTERN,
} from "@/features/finance/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  FinanceTransaction,
  FinanceTransactionType,
} from "@/lib/supabase/finance-types";

type TransactionRow = FinanceTransaction & {
  finance_categories: { id: string; name: string } | null;
  account: { name: string } | null;
  transfer_account: { name: string } | null;
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

  const joinedQuery = supabase
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
    .order("created_at", { ascending: false });

  const [
    { data: joinedRows, error: joinedError },
    { data: allCategories },
    { data: allAccounts },
  ] = await Promise.all([
    joinedQuery,
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

  let rows: FinanceTransaction[] = (joinedRows as unknown as FinanceTransaction[] | null) ?? [];

  if (joinedError || !joinedRows) {
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
    rows = transactions ?? [];
  }

  return rows.map((transaction) => {
    const joined = transaction as TransactionRow;
    const categoryId = joined.category_id;
    const joinedCategoryName =
      joined.finance_categories?.name ??
      (categoryId ? (categoryNameById.get(categoryId) ?? null) : null);

    return {
      id: joined.id,
      type: joined.type,
      amount: Number(joined.amount),
      currency: joined.currency,
      date: joined.date,
      payee: joined.payee,
      notes: joined.notes,
      accountName:
        joined.account?.name ?? accountNameById.get(joined.account_id) ?? "Unknown account",
      categoryId,
      categoryName: resolveCategoryName(joined.type, categoryId, joinedCategoryName),
      transferAccountName:
        joined.transfer_account?.name ??
        (joined.transfer_account_id
          ? (accountNameById.get(joined.transfer_account_id) ?? null)
          : null),
    };
  });
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

/**
 * Loads the calendar month before the one that contains `oldestLoadedDate`.
 * The client passes the start date of the oldest month already on screen.
 */
export async function fetchHistoricalMonth(
  oldestLoadedDate: string,
): Promise<MonthActivity> {
  const trimmed = oldestLoadedDate.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) {
    throw new Error("Date must be YYYY-MM-DD.");
  }
  if (!isValidStrictCalendarDate(trimmed)) {
    throw new Error(`${trimmed} is not a valid calendar date.`);
  }

  return getMonthActivity(calendarMonthBefore(trimmed));
}

/**
 * Inserts a single cashflow transaction. Transfers are stored as a single
 * row (account_id = source, transfer_account_id = destination) rather than
 * two mirrored rows, which is enough to compute correct balances on both
 * accounts (see getAccounts) while keeping this action simple.
 */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<
  { transaction: FinanceTransaction; error?: undefined } | { transaction: null; error: string }
> {
  const amount = toFiniteNumber(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { transaction: null, error: "Amount must be a positive number." };
  }

  if (input.type === "transfer" && input.transferAccountId === input.accountId) {
    return { transaction: null, error: "Transfer destination must differ from the source account." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const date = input.date ?? getTodayDateString();

  let categoryId: string | null = null;
  if (input.type !== "transfer") {
    const parsedCategoryId = parseCategoryId(input.categoryId);
    if (!parsedCategoryId) {
      return { transaction: null, error: "Category id must be a valid UUID." };
    }
    categoryId = parsedCategoryId;
  }

  // Branched (rather than building one merged payload object) so TypeScript
  // narrows `input` per-branch and matches each insert() call's Insert type.
  const { data: transaction, error } =
    input.type === "transfer"
      ? await supabase
          .from("finance_transactions")
          .insert({
            user_id: userId,
            account_id: input.accountId,
            type: input.type,
            amount,
            currency: input.currency,
            date,
            transfer_account_id: input.transferAccountId,
            notes: input.notes ?? null,
          })
          .select("*")
          .single()
      : await supabase
          .from("finance_transactions")
          .insert({
            user_id: userId,
            account_id: input.accountId,
            type: input.type,
            amount,
            currency: input.currency,
            date,
            category_id: categoryId,
            payee: input.payee ?? null,
            notes: input.notes ?? null,
          })
          .select("*")
          .single();

  if (error || !transaction) {
    return { transaction: null, error: error?.message ?? "Failed to create transaction" };
  }

  revalidatePath("/finance");
  return { transaction };
}

/**
 * Updates date, category, and/or amount on an existing cashflow transaction
 * so imported rows can be corrected without deleting and re-entering them.
 */
export async function updateTransaction(
  id: string,
  data: UpdateTransactionData,
): Promise<
  { transaction: FinanceTransaction; error?: undefined } | { transaction: null; error: string }
> {
  const transactionId = id.trim();
  if (!transactionId) {
    return { transaction: null, error: "Transaction id is required." };
  }

  const patch: {
    date?: string;
    amount?: number;
    category_id?: string | null;
  } = {};

  if (data.date !== undefined) {
    if (!ISO_DATE_PATTERN.test(data.date)) {
      return { transaction: null, error: "Date must be in YYYY-MM-DD format." };
    }
    patch.date = data.date;
  }

  if (data.amount !== undefined) {
    const amount = toFiniteNumber(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { transaction: null, error: "Amount must be a positive number." };
    }
    patch.amount = amount;
  }

  if (data.category_id !== undefined) {
    const categoryId = parseCategoryId(data.category_id);
    if (categoryId === undefined) {
      return { transaction: null, error: "Category id must be a valid UUID." };
    }
    patch.category_id = categoryId;
  }

  if (Object.keys(patch).length === 0) {
    return { transaction: null, error: "No changes provided." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: existing, error: existingError } = await supabase
    .from("finance_transactions")
    .select("id, type, category_id")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { transaction: null, error: existingError.message };
  }
  if (!existing) {
    return { transaction: null, error: "Transaction not found." };
  }

  if (patch.category_id !== undefined) {
    if (existing.type === "transfer") {
      return { transaction: null, error: "Transfers cannot have a category." };
    }
    if (!patch.category_id) {
      return { transaction: null, error: "Category is required." };
    }

    const { data: category, error: categoryError } = await supabase
      .from("finance_categories")
      .select("id, kind")
      .eq("id", patch.category_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (categoryError) {
      return { transaction: null, error: categoryError.message };
    }
    if (!category) {
      return { transaction: null, error: "Category not found." };
    }
    if (category.kind !== existing.type) {
      return {
        transaction: null,
        error: `Category must be an ${existing.type} category.`,
      };
    }
  }

  const { data: transaction, error } = await supabase
    .from("finance_transactions")
    .update({
      ...(patch.date !== undefined ? { date: patch.date } : {}),
      ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
      ...(patch.category_id !== undefined ? { category_id: patch.category_id } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !transaction) {
    return { transaction: null, error: error?.message ?? "Failed to update transaction" };
  }

  revalidatePath("/finance");
  return { transaction };
}

/**
 * Deletes a cashflow transaction owned by the current user.
 */
export async function deleteTransaction(
  id: string,
): Promise<{ success: true; error?: undefined } | { success: false; error: string }> {
  const transactionId = id.trim();
  if (!transactionId || !UUID_PATTERN.test(transactionId)) {
    return { success: false, error: "Transaction id must be a valid UUID." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: existing, error: existingError } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }
  if (!existing) {
    return { success: false, error: "Transaction not found." };
  }

  const { error } = await supabase
    .from("finance_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/finance");
  return { success: true };
}

/**
 * Bulk-inserts cashflow transactions parsed from a bank statement CSV into a
 * single account. Type is derived from the sign of each row's amount; since
 * the finance_transactions CHECK constraint requires a category on
 * expense/income rows, imported rows fall back to the user's "Other" /
 * "Other Income" system categories (falling back further to the first
 * category of the matching kind if those seeded categories were renamed).
 */
export async function bulkInsertTransactions(
  accountId: string,
  transactions: BulkImportTransactionRow[],
): Promise<{ count: number; error?: undefined } | { count: 0; error: string }> {
  if (!accountId) {
    return { count: 0, error: "Select an account to import into." };
  }

  const validRows = transactions.filter(
    (row) => row.date && Number.isFinite(row.amount) && row.amount !== 0,
  );

  if (validRows.length === 0) {
    return { count: 0, error: "No valid transaction rows to import." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: account, error: accountError } = await supabase
    .from("finance_accounts")
    .select("id, currency")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (accountError) {
    return { count: 0, error: accountError.message };
  }
  if (!account) {
    return { count: 0, error: "Account not found." };
  }

  const [expenseCategories, incomeCategories] = await Promise.all([
    getCategories("expense"),
    getCategories("income"),
  ]);

  const defaultExpenseCategoryId =
    expenseCategories.find((category) => category.name === "Other")?.id ??
    expenseCategories[0]?.id;
  const defaultIncomeCategoryId =
    incomeCategories.find((category) => category.name === "Other Income")?.id ??
    incomeCategories[0]?.id;

  if (!defaultExpenseCategoryId || !defaultIncomeCategoryId) {
    return {
      count: 0,
      error: "No expense/income categories found. Add categories before importing.",
    };
  }

  const rowsToInsert = validRows.map((row) => {
    const isIncome = row.amount > 0;
    return {
      user_id: userId,
      account_id: accountId,
      type: (isIncome ? "income" : "expense") as FinanceTransactionType,
      amount: Math.abs(row.amount),
      currency: account.currency,
      date: row.date,
      category_id: isIncome ? defaultIncomeCategoryId : defaultExpenseCategoryId,
      payee: row.description || null,
    };
  });

  const { data: inserted, error: insertError } = await supabase
    .from("finance_transactions")
    .insert(rowsToInsert)
    .select("id");

  if (insertError) {
    return { count: 0, error: insertError.message };
  }

  revalidatePath("/finance");
  return { count: inserted?.length ?? 0 };
}
