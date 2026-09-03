"use server";

import { revalidatePath } from "next/cache";

import type {
  AccountWithBalance,
  BulkImportTransactionRow,
  CreateAccountInput,
  CreateInvestmentTransactionInput,
  CreatePortfolioInput,
  CreateSecurityInput,
  CreateTransactionInput,
  HoldingWithDetails,
  RecentTransaction,
  UpdateTransactionData,
} from "@/features/finance/types";
import {
  buildMonthActivity,
  type MonthActivity,
} from "@/features/finance/lib/activity";
import {
  deriveAccountBalances,
  movementsFromCashflowAggregates,
  nextHoldingPosition,
} from "@/features/finance/lib/balances";
import {
  getLiveCryptoPrices as fetchLiveCryptoPrices,
  isEthereumHolding,
} from "@/features/finance/lib/crypto-prices";
import {
  calendarMonthBefore,
  currentCalendarMonth,
  type CalendarMonth,
  type DateRange,
} from "@/features/finance/lib/months";
import {
  ISO_DATE_PATTERN,
  parseCategoryId,
  toFiniteNumber,
  UUID_PATTERN,
} from "@/features/finance/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  FinanceAccount,
  FinanceCategory,
  FinanceCategoryKind,
  FinanceInvestmentTransaction,
  FinancePortfolio,
  FinanceSecurity,
  FinanceTransaction,
  FinanceTransactionType,
} from "@/lib/supabase/finance-types";
import { PLACEHOLDER_USER_ID } from "@/lib/utils/placeholder-user";

function getPlaceholderUserId(): string {
  return process.env.PLACEHOLDER_USER_ID ?? PLACEHOLDER_USER_ID;
}

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

/**
 * Fetches the current Ethereum price in EUR from CoinGecko.
 */
export async function getLiveCryptoPrices() {
  return fetchLiveCryptoPrices();
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * Fetches every finance category for the current user, including nested
 * subcategories (`parent_id` is not filtered). Optionally limited by kind
 * for expense vs income forms. Ordered by name ascending.
 */
export async function getCategories(
  kind?: FinanceCategoryKind,
): Promise<FinanceCategory[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  let query = supabase
    .from("finance_categories")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (kind) {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

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

function assertDateRange(range: DateRange): DateRange {
  if (!ISO_DATE_PATTERN.test(range.startDate) || !ISO_DATE_PATTERN.test(range.endDate)) {
    throw new Error("Date range must use YYYY-MM-DD dates.");
  }
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

// ---------------------------------------------------------------------------
// Investment portfolios, securities & trades
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Investment holdings
// ---------------------------------------------------------------------------

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
