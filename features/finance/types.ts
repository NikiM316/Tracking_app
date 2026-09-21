import type {
  CreateAccountInput as SchemaCreateAccountInput,
  UpdateTransactionInput,
} from "@/features/finance/schemas";
import type {
  FinanceAccount,
  FinanceSecurityType,
  FinanceTransactionType,
} from "@/lib/supabase/finance-types";

export type {
  BulkImportTransactionRow,
  CreateInvestmentTransactionInput,
  CreatePortfolioInput,
  CreateSecurityInput,
  CreateTransactionInput,
} from "@/features/finance/schemas";

export type AccountWithBalance = FinanceAccount & {
  /** opening_balance plus the signed sum of all cashflow transactions. */
  balance: number;
};

export type CreateAccountInput = SchemaCreateAccountInput;

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

export type UpdateTransactionData = Omit<UpdateTransactionInput, "id">;

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
  /** Live ETH/EUR spot price when this holding is Ethereum. */
  livePriceEur: number | null;
  totalInvested: number;
  currentValue: number | null;
  pnlAmount: number | null;
  pnlPercentage: number | null;
};
