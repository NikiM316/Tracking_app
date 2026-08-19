import type {
  FinanceAccount,
  FinanceAccountType,
  FinanceInvestmentTxType,
  FinanceSecurityType,
  FinanceTransaction,
  FinanceTransactionType,
} from "@/lib/supabase/finance-types";

export type AccountWithBalance = FinanceAccount & {
  /** opening_balance plus the signed sum of all cashflow transactions. */
  balance: number;
};

export type CreateAccountInput = {
  name: string;
  accountType: FinanceAccountType;
  currency?: string;
  openingBalance?: number;
};

export type RecentTransaction = {
  id: string;
  type: FinanceTransactionType;
  amount: number;
  currency: string;
  date: string;
  payee: string | null;
  notes: string | null;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  transferAccountName: string | null;
};

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

export type UpdateTransactionData = Partial<
  Pick<FinanceTransaction, "date" | "category_id" | "amount">
>;

export type BulkImportTransactionRow = {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  /** Signed amount: positive = income, negative = expense. */
  amount: number;
  description: string;
};

export type CreatePortfolioInput = {
  name: string;
  baseCurrency?: string;
};

export type CreateSecurityInput = {
  symbol: string;
  name: string;
  securityType: FinanceSecurityType;
  currency?: string;
};

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
