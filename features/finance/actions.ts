"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  FinanceAccount,
  FinanceAccountType,
  FinanceCategory,
  FinanceCategoryKind,
  FinanceInvestmentTransaction,
  FinanceInvestmentTxType,
  FinancePortfolio,
  FinanceSecurity,
  FinanceSecurityType,
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

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export type AccountWithBalance = FinanceAccount & {
  /** opening_balance plus the signed sum of all cashflow transactions. */
  balance: number;
};

/**
 * Fetches every account for the current user along with its derived balance
 * (opening_balance plus the signed sum of finance_transactions), since
 * balances are never stored directly on finance_accounts.
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

  const { data: transactions, error: transactionsError } = await supabase
    .from("finance_transactions")
    .select("account_id, type, amount, transfer_account_id")
    .eq("user_id", userId);

  if (transactionsError) {
    throw new Error(
      `Failed to fetch transactions for balances: ${transactionsError.message}`,
    );
  }

  const netMovementByAccountId = new Map<string, number>();
  const addMovement = (accountId: string, amount: number) => {
    netMovementByAccountId.set(
      accountId,
      (netMovementByAccountId.get(accountId) ?? 0) + amount,
    );
  };

  for (const transaction of transactions ?? []) {
    const amount = Number(transaction.amount);

    if (transaction.type === "income") {
      addMovement(transaction.account_id, amount);
    } else if (transaction.type === "expense") {
      addMovement(transaction.account_id, -amount);
    } else if (transaction.type === "transfer" && transaction.transfer_account_id) {
      addMovement(transaction.account_id, -amount);
      addMovement(transaction.transfer_account_id, amount);
    }
  }

  return accounts.map((account) => ({
    ...account,
    balance: Number(account.opening_balance) + (netMovementByAccountId.get(account.id) ?? 0),
  }));
}

export type CreateAccountInput = {
  name: string;
  accountType: FinanceAccountType;
  currency?: string;
  openingBalance?: number;
};

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

  const openingBalance = input.openingBalance ?? 0;
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
 * Fetches the current user's finance categories, optionally filtered by kind
 * (expense vs income) for transaction forms.
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
    .order("sort_order", { ascending: true })
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

export type RecentTransaction = {
  id: string;
  type: FinanceTransactionType;
  amount: number;
  currency: string;
  date: string;
  payee: string | null;
  notes: string | null;
  accountName: string;
  categoryName: string | null;
  transferAccountName: string | null;
};

/**
 * Fetches the most recent cashflow transactions for the current user,
 * enriched with account/category names for display (resolved with two
 * lookup queries rather than a Postgres embed, matching the manual-join
 * pattern used in features/fitness/actions/workout.ts).
 */
export async function getRecentTransactions(
  limit: number = 10,
): Promise<RecentTransaction[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: transactions, error: transactionsError } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (transactionsError) {
    throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
  }

  if (!transactions || transactions.length === 0) {
    return [];
  }

  const accountIds = new Set<string>();
  const categoryIds = new Set<string>();
  for (const transaction of transactions) {
    accountIds.add(transaction.account_id);
    if (transaction.transfer_account_id) {
      accountIds.add(transaction.transfer_account_id);
    }
    if (transaction.category_id) {
      categoryIds.add(transaction.category_id);
    }
  }

  const [{ data: accounts, error: accountsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase.from("finance_accounts").select("id, name").in("id", [...accountIds]),
      categoryIds.size > 0
        ? supabase.from("finance_categories").select("id, name").in("id", [...categoryIds])
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (accountsError) {
    throw new Error(`Failed to fetch accounts for transactions: ${accountsError.message}`);
  }
  if (categoriesError) {
    throw new Error(`Failed to fetch categories for transactions: ${categoriesError.message}`);
  }

  const accountNameById = new Map((accounts ?? []).map((account) => [account.id, account.name]));
  const categoryNameById = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );

  return transactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    date: transaction.date,
    payee: transaction.payee,
    notes: transaction.notes,
    accountName: accountNameById.get(transaction.account_id) ?? "Unknown account",
    categoryName: transaction.category_id
      ? categoryNameById.get(transaction.category_id) ?? null
      : null,
    transferAccountName: transaction.transfer_account_id
      ? accountNameById.get(transaction.transfer_account_id) ?? null
      : null,
  }));
}

export type CreateTransactionInput =
  | {
      type: "expense" | "income";
      accountId: string;
      categoryId: string;
      amount: number;
      currency?: string;
      date?: string;
      payee?: string;
      notes?: string;
    }
  | {
      type: "transfer";
      accountId: string;
      transferAccountId: string;
      amount: number;
      currency?: string;
      date?: string;
      notes?: string;
    };

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
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { transaction: null, error: "Amount must be a positive number." };
  }

  if (input.type === "transfer" && input.transferAccountId === input.accountId) {
    return { transaction: null, error: "Transfer destination must differ from the source account." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const date = input.date ?? getTodayDateString();

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
            amount: input.amount,
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
            amount: input.amount,
            currency: input.currency,
            date,
            category_id: input.categoryId,
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

export type BulkImportTransactionRow = {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  /** Signed amount: positive = income, negative = expense. */
  amount: number;
  description: string;
};

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

export type CreatePortfolioInput = {
  name: string;
  baseCurrency?: string;
};

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

export type CreateSecurityInput = {
  symbol: string;
  name: string;
  securityType: FinanceSecurityType;
  currency?: string;
};

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

export type CreateInvestmentTransactionInput = {
  portfolioId: string;
  type: Extract<FinanceInvestmentTxType, "buy" | "sell">;
  symbol: string;
  name?: string;
  securityType: FinanceSecurityType;
  quantity: number;
  price: number;
  currency?: string;
  tradeDate?: string;
  notes?: string;
};

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
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { transaction: null, error: "Quantity must be a positive number." };
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
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
  const amount = Number((input.quantity * input.price).toFixed(2));
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

  if (input.type === "sell" && input.quantity > previousQuantity) {
    return {
      transaction: null,
      error: `Cannot sell ${input.quantity}; only ${previousQuantity} available.`,
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
      quantity: input.quantity,
      price: input.price,
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

  let nextQuantity: number;
  let nextAverageCost: number;

  if (input.type === "buy") {
    nextQuantity = previousQuantity + input.quantity;
    nextAverageCost =
      nextQuantity === 0
        ? 0
        : (previousQuantity * previousAverageCost + input.quantity * input.price) / nextQuantity;
  } else {
    nextQuantity = previousQuantity - input.quantity;
    nextAverageCost = nextQuantity === 0 ? 0 : previousAverageCost;
  }

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

export type HoldingWithDetails = {
  id: string;
  portfolioId: string;
  portfolioName: string;
  securityId: string;
  symbol: string;
  name: string;
  securityType: FinanceSecurityType;
  quantity: number;
  averageCost: number;
  currency: string;
};

/**
 * Fetches every investment holding across the current user's portfolios,
 * enriched with portfolio and security details for display.
 */
export async function getPortfolioHoldings(): Promise<HoldingWithDetails[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: portfolios, error: portfoliosError } = await supabase
    .from("finance_portfolios")
    .select("id, name")
    .eq("user_id", userId);

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
    return {
      id: holding.id,
      portfolioId: holding.portfolio_id,
      portfolioName: portfolioNameById.get(holding.portfolio_id) ?? "Unknown portfolio",
      securityId: holding.security_id,
      symbol: security?.symbol ?? "?",
      name: security?.name ?? "Unknown security",
      securityType: security?.security_type ?? "other",
      quantity: Number(holding.quantity),
      averageCost: Number(holding.average_cost),
      currency: holding.currency,
    };
  });
}
