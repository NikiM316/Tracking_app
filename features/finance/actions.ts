"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  FinanceAccount,
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
