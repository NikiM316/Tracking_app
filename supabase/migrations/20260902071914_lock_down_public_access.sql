-- Lock down all client-facing database access for the single-user prototype.
--
-- Context: this app has no login flow. Every read and write goes through the
-- server-side service-role client (lib/supabase/server.ts), which bypasses RLS.
-- The anon and authenticated roles are therefore never legitimately used, but
-- they were still reachable through PostgREST. See SECURITY.md.
--
-- Three things happen here:
--   1. Close the one genuine hole: increment_workout_water was SECURITY DEFINER
--      with EXECUTE granted to PUBLIC, so anon could inflate the water total of
--      any workout by id. RLS did not protect it, definer functions run as owner.
--   2. Replace the implicit "RLS on, zero policies" state with explicit deny-all
--      policies, so the posture is declared intent rather than an accident, and
--      the rls_enabled_no_policy advisory stops firing.
--   3. Remove the table grants and future default grants behind those policies,
--      so the lockdown does not silently collapse if RLS is ever toggled off.

-- 1. The exposed RPC ---------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.increment_workout_water(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_workout_water(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_workout_water(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_workout_water(uuid, integer) TO service_role;

-- 2. Explicit deny-all policies on every table -------------------------------
-- Applied as a loop so the invariant holds for tables added later: re-running
-- this block after adding a table is enough to bring it under the same policy.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    EXECUTE format('DROP POLICY IF EXISTS deny_all_anon_authenticated ON public.%I', r.relname);
    EXECUTE format(
      'CREATE POLICY deny_all_anon_authenticated ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      r.relname
    );
  END LOOP;
END $$;

-- 3. Strip the grants sitting behind those policies --------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;

-- Supabase's default privileges re-grant everything to anon/authenticated on
-- each newly created table; stop that so new tables are locked down on creation.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;

-- Postgres grants EXECUTE on new functions to PUBLIC. Revoke that default for
-- every role that can create functions, globally (no IN SCHEMA), so a later
-- SECURITY DEFINER RPC cannot become anon-callable the way increment_workout_water
-- was. Do not GRANT EXECUTE back to anon or authenticated.
DO $$
DECLARE
  creator_role text;
BEGIN
  FOR creator_role IN
    SELECT rolname
    FROM pg_roles
    WHERE has_schema_privilege(rolname, 'public', 'CREATE')
      AND rolname NOT LIKE 'pg_%'
    ORDER BY rolname
  LOOP
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC',
      creator_role
    );
  END LOOP;
END $$;

-- Table and sequence grants for service_role stay as they are (BYPASSRLS).
-- Function execute is granted only on increment_workout_water above; new
-- functions must be granted to service_role explicitly.
