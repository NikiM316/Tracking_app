"use server";

import { revalidatePath } from "next/cache";

import { calendarMonthBefore } from "@/features/finance/lib/months";
import { getOwnedAccount } from "@/features/finance/queries/accounts";
import { getCategories, getOwnedCategory } from "@/features/finance/queries/categories";
import { getMonthActivity } from "@/features/finance/queries/transactions";
import {
  bulkImportTransactionRowSchema,
  bulkInsertTransactionsSchema,
  createTransactionSchema,
  deleteTransactionSchema,
  fetchHistoricalMonthSchema,
  updateTransactionSchema,
} from "@/features/finance/schemas";
import type {
  BulkImportTransactionRow,
  CreateTransactionInput,
  UpdateTransactionData,
} from "@/features/finance/types";
import { getTodayDateString } from "@/features/finance/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { parseActionInput } from "@/lib/validation";
import type { FinanceTransaction, FinanceTransactionType } from "@/lib/supabase/finance-types";
import type { MonthActivity } from "@/features/finance/lib/activity";

/**
 * Loads the calendar month before the one that contains `oldestLoadedDate`.
 * The client passes the start date of the oldest month already on screen.
 */
export async function fetchHistoricalMonth(
  oldestLoadedDate: string,
): Promise<MonthActivity> {
  const parsed = parseActionInput(fetchHistoricalMonthSchema, oldestLoadedDate);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return getMonthActivity(calendarMonthBefore(parsed.data));
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
  const parsed = parseActionInput(createTransactionSchema, input);
  if (!parsed.ok) {
    return { transaction: null, error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const data = parsed.data;
  const date = data.date ?? getTodayDateString();

  let account;
  try {
    account = await getOwnedAccount(supabase, userId, data.accountId);
  } catch (cause) {
    return {
      transaction: null,
      error: cause instanceof Error ? cause.message : "Failed to look up account.",
    };
  }
  if (!account) {
    return { transaction: null, error: "Account not found." };
  }

  if (data.type === "transfer") {
    let destination;
    try {
      destination = await getOwnedAccount(supabase, userId, data.transferAccountId);
    } catch (cause) {
      return {
        transaction: null,
        error: cause instanceof Error ? cause.message : "Failed to look up destination account.",
      };
    }
    if (!destination) {
      return { transaction: null, error: "Destination account not found." };
    }

    const { data: transaction, error } = await supabase
      .from("finance_transactions")
      .insert({
        user_id: userId,
        account_id: data.accountId,
        type: data.type,
        amount: data.amount,
        currency: data.currency ?? account.currency,
        date,
        transfer_account_id: data.transferAccountId,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();

    if (error || !transaction) {
      return { transaction: null, error: error?.message ?? "Failed to create transaction" };
    }

    revalidatePath("/finance");
    return { transaction };
  }

  let category;
  try {
    category = await getOwnedCategory(supabase, userId, data.categoryId);
  } catch (cause) {
    return {
      transaction: null,
      error: cause instanceof Error ? cause.message : "Failed to look up category.",
    };
  }
  if (!category) {
    return { transaction: null, error: "Category not found." };
  }
  if (category.kind !== data.type) {
    return {
      transaction: null,
      error: `Category must be an ${data.type} category.`,
    };
  }

  const { data: transaction, error } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: userId,
      account_id: data.accountId,
      type: data.type,
      amount: data.amount,
      currency: data.currency ?? account.currency,
      date,
      category_id: data.categoryId,
      payee: data.payee ?? null,
      notes: data.notes ?? null,
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
  const parsed = parseActionInput(updateTransactionSchema, { id, ...data });
  if (!parsed.ok) {
    return { transaction: null, error: parsed.error };
  }

  const { id: transactionId, date, amount, category_id: categoryId } = parsed.data;
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

  if (categoryId !== undefined) {
    if (existing.type === "transfer") {
      return { transaction: null, error: "Transfers cannot have a category." };
    }
    if (!categoryId) {
      return { transaction: null, error: "Category is required." };
    }

    let category;
    try {
      category = await getOwnedCategory(supabase, userId, categoryId);
    } catch (cause) {
      return {
        transaction: null,
        error: cause instanceof Error ? cause.message : "Failed to look up category.",
      };
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
      ...(date !== undefined ? { date } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(categoryId !== undefined ? { category_id: categoryId } : {}),
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
  const parsed = parseActionInput(deleteTransactionSchema, { id });
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const transactionId = parsed.data.id;
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
  const parsed = parseActionInput(bulkInsertTransactionsSchema, {
    accountId,
    transactions,
  });
  if (!parsed.ok) {
    return { count: 0, error: parsed.error };
  }

  const validRows: BulkImportTransactionRow[] = [];
  for (const row of parsed.data.transactions) {
    const rowResult = bulkImportTransactionRowSchema.safeParse(row);
    if (rowResult.success) {
      validRows.push(rowResult.data);
    }
  }

  if (validRows.length === 0) {
    return { count: 0, error: "No valid transaction rows to import." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  let account;
  try {
    account = await getOwnedAccount(supabase, userId, parsed.data.accountId);
  } catch (cause) {
    return {
      count: 0,
      error: cause instanceof Error ? cause.message : "Failed to look up account.",
    };
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
    const type: FinanceTransactionType = isIncome ? "income" : "expense";
    return {
      user_id: userId,
      account_id: parsed.data.accountId,
      type,
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
