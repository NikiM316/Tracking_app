-- Phase 8: drop schema that the app never used.
--
-- Live check before this migration (project rxfcnpdwwkfaaxnciyxj):
--   unused tables empty except finance_settings (one seed row),
--   no zone_2 sets, no two-row transfers, no cashflow_transaction_id links,
--   no portfolio account_id links, every challenge uses on_any_fail.

-- Finance: unused tables -----------------------------------------------------

DROP TABLE public.finance_budget_items;
DROP TABLE public.finance_budgets;
DROP TABLE public.finance_fx_rates;
DROP TABLE public.finance_security_prices;
DROP TABLE public.finance_settings;

DROP TYPE public.finance_budget_period;

-- Finance: unused columns ----------------------------------------------------

ALTER TABLE public.finance_investment_transactions
  DROP COLUMN cashflow_transaction_id;

ALTER TABLE public.finance_portfolios
  DROP COLUMN account_id;

ALTER TABLE public.finance_transactions
  DROP COLUMN transfer_transaction_id;

COMMENT ON TABLE public.finance_categories IS
  'User-scoped, self-referencing expense/income category tree used to classify transactions.';

COMMENT ON TABLE public.finance_transactions IS
  'Single source of truth for cash movement. amount is always positive; sign is derived from type when computing balances (expense=-, income=+, transfer debiting account_id and crediting transfer_account_id on the same row).';

COMMENT ON TABLE public.finance_portfolios IS
  'Groups holdings and investment transactions for portfolio-level performance reporting.';

COMMENT ON TABLE public.finance_investment_transactions IS
  'Append-only history of portfolio activity (buys, sells, dividends, fees, splits) used for cost basis and performance analytics.';

COMMENT ON TABLE public.finance_holdings IS
  'Derived/cached current position per portfolio and security (quantity, average cost). Source of truth for history is finance_investment_transactions; this table is a fast-read snapshot kept in sync by the app.';

COMMENT ON FUNCTION public.finance_cashflow_totals(uuid) IS
  'Per-account SUM of income and expense amounts for the given user. Used by getAccounts to avoid scanning every cashflow row. Transfers stay as individual rows because each transfer is one ledger row with a destination account.';

-- Monk: unused tables --------------------------------------------------------

DROP TABLE public.monk_app_usage;
DROP TABLE public.monk_goals;
DROP TABLE public.monk_commitments;
DROP TABLE public.monk_overrides;

DROP TYPE public.monk_goal_status;
DROP TYPE public.monk_override_entity_type;

-- Monk: unused reset-rule columns --------------------------------------------
-- Failures always end the attempt. The unused consecutive/window rules and
-- their supporting columns never had UI or scoring logic.

ALTER TABLE public.monk_settings
  DROP COLUMN reset_rule,
  DROP COLUMN reset_consecutive_count,
  DROP COLUMN reset_window_days,
  DROP COLUMN reset_window_fail_count;

ALTER TABLE public.monk_challenges
  DROP COLUMN reset_rule,
  DROP COLUMN reset_consecutive_count,
  DROP COLUMN reset_window_days,
  DROP COLUMN reset_window_fail_count;

DROP TYPE public.monk_reset_rule;

-- Fitness: drop unused zone_2 set category -----------------------------------
-- Recreate the enum rather than ALTER TYPE ... DROP VALUE. Postgres can drop
-- enum labels in 16+, but leftover index entries make that unsafe; swapping
-- the type is the documented replacement.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sets
    WHERE set_category = 'zone_2'
  ) THEN
    RAISE EXCEPTION 'Cannot drop set_category.zone_2: existing sets still use it';
  END IF;
END $$;

CREATE TYPE public.set_category_new AS ENUM (
  'warmup',
  'top_set',
  'back_off',
  'working_set'
);

ALTER TABLE public.sets
  ALTER COLUMN set_category TYPE public.set_category_new
  USING set_category::text::public.set_category_new;

DROP TYPE public.set_category;

ALTER TYPE public.set_category_new RENAME TO set_category;
