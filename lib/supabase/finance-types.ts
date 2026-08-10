// Hand-written Supabase types for the finance domain (see migration
// `create_finance_schema` and the "Finance Database Schema" section of
// project-context.md for the full design). Mirrors the style of the
// fitness types in `./types.ts`; merged into the shared `Database` type there.

export type FinanceAccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit_card"
  | "loan"
  | "brokerage"
  | "other";

export type FinanceTransactionType = "expense" | "income" | "transfer";

export type FinanceCategoryKind = "expense" | "income";

export type FinanceBudgetPeriod = "monthly" | "weekly" | "yearly";

export type FinanceSecurityType =
  | "stock"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "crypto"
  | "commodity"
  | "real_estate"
  | "other";

export type FinanceInvestmentTxType =
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "fee"
  | "split"
  | "transfer_in"
  | "transfer_out"
  | "other";

export type FinanceSettings = {
  user_id: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
};

export type FinanceAccount = {
  id: string;
  user_id: string;
  name: string;
  account_type: FinanceAccountType;
  currency: string;
  opening_balance: number;
  opening_balance_date: string;
  is_archived: boolean;
  institution: string | null;
  external_id: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceCategory = {
  id: string;
  user_id: string;
  parent_id: string | null;
  kind: FinanceCategoryKind;
  name: string;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  sort_order: number;
  created_at: string;
};

export type FinanceTransaction = {
  id: string;
  user_id: string;
  account_id: string;
  type: FinanceTransactionType;
  amount: number;
  currency: string;
  date: string;
  category_id: string | null;
  transfer_account_id: string | null;
  transfer_transaction_id: string | null;
  payee: string | null;
  notes: string | null;
  is_cleared: boolean;
  external_id: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceBudget = {
  id: string;
  user_id: string;
  name: string;
  period: FinanceBudgetPeriod;
  start_date: string;
  end_date: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type FinanceBudgetItem = {
  id: string;
  budget_id: string;
  category_id: string;
  allocated_amount: number;
  created_at: string;
};

export type FinancePortfolio = {
  id: string;
  user_id: string;
  name: string;
  base_currency: string;
  account_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceSecurity = {
  id: string;
  user_id: string | null;
  symbol: string;
  name: string;
  security_type: FinanceSecurityType;
  currency: string;
  exchange: string | null;
  isin: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type FinanceHolding = {
  id: string;
  portfolio_id: string;
  security_id: string;
  quantity: number;
  average_cost: number;
  currency: string;
  updated_at: string;
};

export type FinanceInvestmentTransaction = {
  id: string;
  user_id: string;
  portfolio_id: string;
  security_id: string | null;
  type: FinanceInvestmentTxType;
  trade_date: string;
  quantity: number | null;
  price: number | null;
  amount: number;
  fees: number;
  currency: string;
  cashflow_transaction_id: string | null;
  notes: string | null;
  external_id: string | null;
  provider: string | null;
  created_at: string;
};

export type FinanceSecurityPrice = {
  id: string;
  security_id: string;
  price_date: string;
  close: number;
  currency: string;
  source: string | null;
  created_at: string;
};

export type FinanceFxRate = {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate_date: string;
  rate: number;
  created_at: string;
};

export type FinanceTables = {
  finance_settings: {
    Row: FinanceSettings;
    Insert: Omit<FinanceSettings, "base_currency" | "created_at" | "updated_at"> & {
      base_currency?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<FinanceSettings, "user_id">>;
    Relationships: [];
  };
  finance_accounts: {
    Row: FinanceAccount;
    Insert: Omit<
      FinanceAccount,
      | "id"
      | "currency"
      | "opening_balance"
      | "opening_balance_date"
      | "is_archived"
      | "institution"
      | "external_id"
      | "provider"
      | "created_at"
      | "updated_at"
    > & {
      id?: string;
      currency?: string;
      opening_balance?: number;
      opening_balance_date?: string;
      is_archived?: boolean;
      institution?: string | null;
      external_id?: string | null;
      provider?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<FinanceAccount, "id">>;
    Relationships: [];
  };
  finance_categories: {
    Row: FinanceCategory;
    Insert: Omit<
      FinanceCategory,
      "id" | "parent_id" | "icon" | "color" | "is_system" | "sort_order" | "created_at"
    > & {
      id?: string;
      parent_id?: string | null;
      icon?: string | null;
      color?: string | null;
      is_system?: boolean;
      sort_order?: number;
      created_at?: string;
    };
    Update: Partial<Omit<FinanceCategory, "id">>;
    Relationships: [];
  };
  finance_transactions: {
    Row: FinanceTransaction;
    Insert: Omit<
      FinanceTransaction,
      | "id"
      | "currency"
      | "date"
      | "category_id"
      | "transfer_account_id"
      | "transfer_transaction_id"
      | "payee"
      | "notes"
      | "is_cleared"
      | "external_id"
      | "provider"
      | "created_at"
      | "updated_at"
    > & {
      id?: string;
      currency?: string;
      date?: string;
      category_id?: string | null;
      transfer_account_id?: string | null;
      transfer_transaction_id?: string | null;
      payee?: string | null;
      notes?: string | null;
      is_cleared?: boolean;
      external_id?: string | null;
      provider?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<FinanceTransaction, "id">>;
    Relationships: [];
  };
  finance_budgets: {
    Row: FinanceBudget;
    Insert: Omit<
      FinanceBudget,
      "id" | "period" | "end_date" | "currency" | "created_at" | "updated_at"
    > & {
      id?: string;
      period?: FinanceBudgetPeriod;
      end_date?: string | null;
      currency?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<FinanceBudget, "id">>;
    Relationships: [];
  };
  finance_budget_items: {
    Row: FinanceBudgetItem;
    Insert: Omit<FinanceBudgetItem, "id" | "created_at"> & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Omit<FinanceBudgetItem, "id">>;
    Relationships: [];
  };
  finance_portfolios: {
    Row: FinancePortfolio;
    Insert: Omit<
      FinancePortfolio,
      "id" | "base_currency" | "account_id" | "is_archived" | "created_at" | "updated_at"
    > & {
      id?: string;
      base_currency?: string;
      account_id?: string | null;
      is_archived?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<FinancePortfolio, "id">>;
    Relationships: [];
  };
  finance_securities: {
    Row: FinanceSecurity;
    Insert: Omit<
      FinanceSecurity,
      "id" | "user_id" | "currency" | "exchange" | "isin" | "metadata" | "created_at"
    > & {
      id?: string;
      user_id?: string | null;
      currency?: string;
      exchange?: string | null;
      isin?: string | null;
      metadata?: Record<string, unknown>;
      created_at?: string;
    };
    Update: Partial<Omit<FinanceSecurity, "id">>;
    Relationships: [];
  };
  finance_holdings: {
    Row: FinanceHolding;
    Insert: Omit<
      FinanceHolding,
      "id" | "quantity" | "average_cost" | "currency" | "updated_at"
    > & {
      id?: string;
      quantity?: number;
      average_cost?: number;
      currency?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<FinanceHolding, "id">>;
    Relationships: [];
  };
  finance_investment_transactions: {
    Row: FinanceInvestmentTransaction;
    Insert: Omit<
      FinanceInvestmentTransaction,
      | "id"
      | "security_id"
      | "trade_date"
      | "quantity"
      | "price"
      | "fees"
      | "currency"
      | "cashflow_transaction_id"
      | "notes"
      | "external_id"
      | "provider"
      | "created_at"
    > & {
      id?: string;
      security_id?: string | null;
      trade_date?: string;
      quantity?: number | null;
      price?: number | null;
      fees?: number;
      currency?: string;
      cashflow_transaction_id?: string | null;
      notes?: string | null;
      external_id?: string | null;
      provider?: string | null;
      created_at?: string;
    };
    Update: Partial<Omit<FinanceInvestmentTransaction, "id">>;
    Relationships: [];
  };
  finance_security_prices: {
    Row: FinanceSecurityPrice;
    Insert: Omit<FinanceSecurityPrice, "id" | "currency" | "source" | "created_at"> & {
      id?: string;
      currency?: string;
      source?: string | null;
      created_at?: string;
    };
    Update: Partial<Omit<FinanceSecurityPrice, "id">>;
    Relationships: [];
  };
  finance_fx_rates: {
    Row: FinanceFxRate;
    Insert: Omit<FinanceFxRate, "id" | "created_at"> & {
      id?: string;
      created_at?: string;
    };
    Update: Partial<Omit<FinanceFxRate, "id">>;
    Relationships: [];
  };
};

export type FinanceEnums = {
  finance_account_type: FinanceAccountType;
  finance_transaction_type: FinanceTransactionType;
  finance_category_kind: FinanceCategoryKind;
  finance_budget_period: FinanceBudgetPeriod;
  finance_security_type: FinanceSecurityType;
  finance_investment_tx_type: FinanceInvestmentTxType;
};
