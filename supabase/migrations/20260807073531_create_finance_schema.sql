-- Finance module schema: cashflow ledger (accounts, categories, transactions, budgets)
-- and investment ledger (portfolios, securities, holdings, investment transactions,
-- prices, fx rates). See project-context.md for the full design rationale.

-- Enums
CREATE TYPE finance_account_type AS ENUM ('checking', 'savings', 'cash', 'credit_card', 'loan', 'brokerage', 'other');
CREATE TYPE finance_transaction_type AS ENUM ('expense', 'income', 'transfer');
CREATE TYPE finance_category_kind AS ENUM ('expense', 'income');
CREATE TYPE finance_budget_period AS ENUM ('monthly', 'weekly', 'yearly');
CREATE TYPE finance_security_type AS ENUM ('stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'commodity', 'real_estate', 'other');
CREATE TYPE finance_investment_tx_type AS ENUM ('buy', 'sell', 'dividend', 'interest', 'fee', 'split', 'transfer_in', 'transfer_out', 'other');

-- Shared trigger function to maintain updated_at columns
CREATE FUNCTION finance_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- 1. finance_settings: per-user finance preferences (1:1 with user)
CREATE TABLE finance_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  base_currency text NOT NULL DEFAULT 'EUR' CHECK (base_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE finance_settings IS 'Per-user finance preferences, currently just the reporting/base currency used for cross-currency analytics.';

CREATE TRIGGER finance_settings_set_updated_at
  BEFORE UPDATE ON finance_settings
  FOR EACH ROW EXECUTE FUNCTION finance_set_updated_at();

-- 2. finance_accounts: bank accounts, cash, cards, loans, brokerage cash sleeves
CREATE TABLE finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type finance_account_type NOT NULL,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(18,2) NOT NULL DEFAULT 0,
  opening_balance_date date NOT NULL DEFAULT current_date,
  is_archived boolean NOT NULL DEFAULT false,
  institution text,
  external_id text,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE finance_accounts IS 'Cash, bank, card, loan and brokerage-cash accounts. Balance is derived as opening_balance plus the signed sum of finance_transactions, not stored.';

CREATE INDEX finance_accounts_user_id_idx ON finance_accounts(user_id);
CREATE TRIGGER finance_accounts_set_updated_at
  BEFORE UPDATE ON finance_accounts
  FOR EACH ROW EXECUTE FUNCTION finance_set_updated_at();

-- 3. finance_categories: hierarchical expense/income categories
CREATE TABLE finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
  kind finance_category_kind NOT NULL,
  name text NOT NULL,
  icon text,
  color text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE finance_categories IS 'User-scoped, self-referencing expense/income category tree used to classify transactions and budget items.';

CREATE INDEX finance_categories_user_id_idx ON finance_categories(user_id);
CREATE INDEX finance_categories_parent_id_idx ON finance_categories(parent_id);
CREATE UNIQUE INDEX finance_categories_user_kind_parent_name_key
  ON finance_categories(user_id, kind, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- 4. finance_transactions: unified cashflow ledger (expense/income/transfer)
CREATE TABLE finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  type finance_transaction_type NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  date date NOT NULL DEFAULT current_date,
  category_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
  transfer_account_id uuid REFERENCES finance_accounts(id) ON DELETE SET NULL,
  transfer_transaction_id uuid REFERENCES finance_transactions(id) ON DELETE SET NULL,
  payee text,
  notes text,
  is_cleared boolean NOT NULL DEFAULT true,
  external_id text,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_transactions_type_shape_check CHECK (
    (type IN ('expense', 'income') AND category_id IS NOT NULL AND transfer_account_id IS NULL)
    OR
    (type = 'transfer' AND category_id IS NULL AND transfer_account_id IS NOT NULL AND transfer_account_id <> account_id)
  )
);
COMMENT ON TABLE finance_transactions IS 'Single source of truth for cash movement. amount is always positive; sign is derived from type when computing balances (expense=-, income=+, transfer mirrored across two linked rows via transfer_transaction_id).';

CREATE INDEX finance_transactions_user_date_idx ON finance_transactions(user_id, date DESC);
CREATE INDEX finance_transactions_account_date_idx ON finance_transactions(account_id, date DESC);
CREATE INDEX finance_transactions_category_date_idx ON finance_transactions(category_id, date);
CREATE INDEX finance_transactions_transfer_transaction_id_idx ON finance_transactions(transfer_transaction_id);
CREATE TRIGGER finance_transactions_set_updated_at
  BEFORE UPDATE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION finance_set_updated_at();

-- 5. finance_budgets + finance_budget_items: period budgets with per-category limits
CREATE TABLE finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  period finance_budget_period NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL,
  end_date date,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_budgets_date_range_check CHECK (end_date IS NULL OR end_date >= start_date)
);
COMMENT ON TABLE finance_budgets IS 'A budgeting period (e.g. a recurring monthly budget) that groups per-category spending limits in finance_budget_items.';

CREATE INDEX finance_budgets_user_id_idx ON finance_budgets(user_id);
CREATE TRIGGER finance_budgets_set_updated_at
  BEFORE UPDATE ON finance_budgets
  FOR EACH ROW EXECUTE FUNCTION finance_set_updated_at();

CREATE TABLE finance_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES finance_budgets(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
  allocated_amount numeric(18,2) NOT NULL CHECK (allocated_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (budget_id, category_id)
);
COMMENT ON TABLE finance_budget_items IS 'Per-category allocation within a budget; compared against actual spend from finance_transactions for variance reporting.';

CREATE INDEX finance_budget_items_category_id_idx ON finance_budget_items(category_id);

-- 6. finance_portfolios: investment containers (e.g. a brokerage, a crypto wallet, a pension)
CREATE TABLE finance_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_currency text NOT NULL DEFAULT 'EUR' CHECK (base_currency ~ '^[A-Z]{3}$'),
  account_id uuid REFERENCES finance_accounts(id) ON DELETE SET NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE finance_portfolios IS 'Groups holdings and investment transactions for portfolio-level performance reporting. Optionally linked to a finance_accounts cash sleeve.';

CREATE INDEX finance_portfolios_user_id_idx ON finance_portfolios(user_id);
CREATE INDEX finance_portfolios_account_id_idx ON finance_portfolios(account_id);
CREATE TRIGGER finance_portfolios_set_updated_at
  BEFORE UPDATE ON finance_portfolios
  FOR EACH ROW EXECUTE FUNCTION finance_set_updated_at();

-- 7. finance_securities: catalog of investable instruments (shared or user-custom)
CREATE TABLE finance_securities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  name text NOT NULL,
  security_type finance_security_type NOT NULL,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  exchange text,
  isin text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE finance_securities IS 'Catalog of investable instruments (stocks, ETFs, crypto, custom assets). user_id NULL means a shared catalog entry; non-null means a user-private custom asset (e.g. real estate).';

CREATE UNIQUE INDEX finance_securities_shared_symbol_exchange_key
  ON finance_securities(symbol, exchange) WHERE user_id IS NULL;
CREATE UNIQUE INDEX finance_securities_user_symbol_key
  ON finance_securities(user_id, symbol) WHERE user_id IS NOT NULL;

-- 8. finance_holdings: current position snapshot per portfolio/security
CREATE TABLE finance_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES finance_portfolios(id) ON DELETE CASCADE,
  security_id uuid NOT NULL REFERENCES finance_securities(id) ON DELETE RESTRICT,
  quantity numeric(28,10) NOT NULL DEFAULT 0,
  average_cost numeric(18,6) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, security_id)
);
COMMENT ON TABLE finance_holdings IS 'Derived/cached current position per portfolio and security (quantity, average cost). Source of truth for history is finance_investment_transactions; this table is a fast-read snapshot kept in sync by the app.';

CREATE INDEX finance_holdings_security_id_idx ON finance_holdings(security_id);
CREATE TRIGGER finance_holdings_set_updated_at
  BEFORE UPDATE ON finance_holdings
  FOR EACH ROW EXECUTE FUNCTION finance_set_updated_at();

-- 9. finance_investment_transactions: portfolio activity ledger (buy/sell/dividend/etc.)
CREATE TABLE finance_investment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id uuid NOT NULL REFERENCES finance_portfolios(id) ON DELETE CASCADE,
  security_id uuid REFERENCES finance_securities(id) ON DELETE RESTRICT,
  type finance_investment_tx_type NOT NULL,
  trade_date date NOT NULL DEFAULT current_date,
  quantity numeric(28,10),
  price numeric(18,6),
  amount numeric(18,2) NOT NULL,
  fees numeric(18,2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  cashflow_transaction_id uuid REFERENCES finance_transactions(id) ON DELETE SET NULL,
  notes text,
  external_id text,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_investment_tx_security_required_check CHECK (
    security_id IS NOT NULL OR type IN ('fee', 'interest', 'transfer_in', 'transfer_out', 'other')
  )
);
COMMENT ON TABLE finance_investment_transactions IS 'Append-only history of portfolio activity (buys, sells, dividends, fees, splits) used for cost basis and performance analytics. cashflow_transaction_id links to finance_transactions when funded from/to a cash account so net worth stays consistent.';

CREATE INDEX finance_investment_tx_portfolio_date_idx ON finance_investment_transactions(portfolio_id, trade_date);
CREATE INDEX finance_investment_tx_security_date_idx ON finance_investment_transactions(security_id, trade_date);
CREATE INDEX finance_investment_tx_user_date_idx ON finance_investment_transactions(user_id, trade_date DESC);
CREATE INDEX finance_investment_tx_cashflow_tx_idx ON finance_investment_transactions(cashflow_transaction_id);

-- 10. finance_security_prices: historical market prices for valuation and charts
CREATE TABLE finance_security_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id uuid NOT NULL REFERENCES finance_securities(id) ON DELETE CASCADE,
  price_date date NOT NULL,
  close numeric(18,6) NOT NULL CHECK (close >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (security_id, price_date)
);
COMMENT ON TABLE finance_security_prices IS 'Historical daily close prices used to mark holdings to market and build performance time series.';

CREATE INDEX finance_security_prices_security_date_idx ON finance_security_prices(security_id, price_date DESC);

-- 11. finance_fx_rates: currency conversion rates for multi-currency analytics
CREATE TABLE finance_fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL CHECK (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text NOT NULL CHECK (quote_currency ~ '^[A-Z]{3}$'),
  rate_date date NOT NULL,
  rate numeric(18,8) NOT NULL CHECK (rate > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency, rate_date)
);
COMMENT ON TABLE finance_fx_rates IS 'Daily currency conversion rates used to convert multi-currency balances and returns into a single reporting currency for net worth and performance dashboards.';

CREATE INDEX finance_fx_rates_lookup_idx ON finance_fx_rates(base_currency, quote_currency, rate_date DESC);

-- Enable RLS on every finance table (policies added once Supabase Auth is wired;
-- until then the server-role client bypasses RLS, matching the fitness tables today)
ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_securities ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_security_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_fx_rates ENABLE ROW LEVEL SECURITY;
