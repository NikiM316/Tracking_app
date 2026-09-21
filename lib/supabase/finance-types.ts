import type { Enums, Tables } from "./database.generated";

export type FinanceAccountType = Enums<"finance_account_type">;
export type FinanceTransactionType = Enums<"finance_transaction_type">;
export type FinanceCategoryKind = Enums<"finance_category_kind">;
export type FinanceSecurityType = Enums<"finance_security_type">;
export type FinanceInvestmentTxType = Enums<"finance_investment_tx_type">;

export type FinanceAccount = Tables<"finance_accounts">;
export type FinanceCategory = Tables<"finance_categories">;
export type FinanceTransaction = Tables<"finance_transactions">;
export type FinancePortfolio = Tables<"finance_portfolios">;
export type FinanceSecurity = Tables<"finance_securities">;
export type FinanceHolding = Tables<"finance_holdings">;
export type FinanceInvestmentTransaction = Tables<"finance_investment_transactions">;
