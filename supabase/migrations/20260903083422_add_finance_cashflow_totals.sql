-- Grouped income/expense totals for account balance derivation.
--
-- PostgREST aggregate functions are disabled on this project, so getAccounts
-- cannot SUM() through the Data API. This RPC returns one row per
-- (account_id, type) instead of every cashflow transaction.
--
-- Transfers stay as individual rows in the app: they can be linked pairs and
-- need the same outgoing-row rule as features/finance/lib/balances.ts.
--
-- SECURITY INVOKER: service_role is the only caller and already bypasses RLS.
-- Do not GRANT EXECUTE to anon or authenticated.

CREATE FUNCTION public.finance_cashflow_totals(p_user_id uuid)
RETURNS TABLE (
  account_id uuid,
  type public.finance_transaction_type,
  net numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    t.account_id,
    t.type,
    SUM(t.amount) AS net
  FROM public.finance_transactions AS t
  WHERE t.user_id = p_user_id
    AND t.type IN ('income', 'expense')
  GROUP BY t.account_id, t.type;
$$;

REVOKE ALL ON FUNCTION public.finance_cashflow_totals(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_cashflow_totals(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.finance_cashflow_totals(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finance_cashflow_totals(uuid) TO service_role;

COMMENT ON FUNCTION public.finance_cashflow_totals(uuid) IS
  'Per-account SUM of income and expense amounts for the given user. Used by getAccounts to avoid scanning every cashflow row.';
