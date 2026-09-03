-- Atomic catch-up for missed Monk Mode days.
--
-- catchUpMissedDays used to insert monk_days, insert habit-log snapshots, and
-- finalize open days as separate PostgREST calls. A failure in the middle left
-- days without snapshots or snapshots without a matching finalization.
--
-- plpgsql already runs in the caller's transaction (PostgREST uses one
-- transaction per RPC). Any exception aborts the function and rolls back every
-- write below. There is no nested COMMIT.
--
-- SECURITY INVOKER: service_role is the only caller and already bypasses RLS.
-- Do not GRANT EXECUTE to anon or authenticated.

CREATE FUNCTION public.catch_up_missed_days_tx(payload jsonb)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
AS $$
DECLARE
  missing_days jsonb;
  habit_logs jsonb;
  day_updates jsonb;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  missing_days := COALESCE(payload -> 'missing_days', '[]'::jsonb);
  habit_logs := COALESCE(payload -> 'habit_logs', '[]'::jsonb);
  day_updates := COALESCE(payload -> 'day_updates', '[]'::jsonb);

  IF jsonb_typeof(missing_days) IS DISTINCT FROM 'array'
     OR jsonb_typeof(habit_logs) IS DISTINCT FROM 'array'
     OR jsonb_typeof(day_updates) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'missing_days, habit_logs, and day_updates must be JSON arrays';
  END IF;

  -- Concurrent catch-up of the same calendar day is a unique conflict, not a
  -- hard failure. Skip the duplicate so the rest of the transaction can still
  -- snapshot habits and finalize open days. Any other insert error aborts.
  INSERT INTO public.monk_days (
    id,
    challenge_id,
    user_id,
    date,
    day_number,
    status,
    finalized_at,
    finalization_source,
    social_media_limit_minutes,
    gaming_limit_minutes
  )
  SELECT
    COALESCE(d.id, gen_random_uuid()),
    d.challenge_id,
    d.user_id,
    d.date,
    d.day_number,
    d.status,
    d.finalized_at,
    d.finalization_source,
    d.social_media_limit_minutes,
    d.gaming_limit_minutes
  FROM jsonb_to_recordset(missing_days) AS d(
    id uuid,
    challenge_id uuid,
    user_id uuid,
    date date,
    day_number integer,
    status public.monk_day_status,
    finalized_at timestamptz,
    finalization_source public.monk_finalization_source,
    social_media_limit_minutes integer,
    gaming_limit_minutes integer
  )
  ON CONFLICT (challenge_id, date) DO NOTHING;

  -- Habit logs for a skipped duplicate day still carry the client-generated
  -- id, which was never inserted. Drop those rows rather than failing the FK.
  INSERT INTO public.monk_habit_logs (
    day_id,
    habit_id,
    is_mandatory_snapshot,
    target_value_snapshot,
    target_unit_snapshot
  )
  SELECT
    l.day_id,
    l.habit_id,
    l.is_mandatory_snapshot,
    l.target_value_snapshot,
    l.target_unit_snapshot
  FROM jsonb_to_recordset(habit_logs) AS l(
    day_id uuid,
    habit_id uuid,
    is_mandatory_snapshot boolean,
    target_value_snapshot numeric,
    target_unit_snapshot text
  )
  WHERE EXISTS (
    SELECT 1
    FROM public.monk_days AS day
    WHERE day.id = l.day_id
  )
  ON CONFLICT (day_id, habit_id) DO NOTHING;

  UPDATE public.monk_days AS day
  SET
    status = u.status,
    finalized_at = u.finalized_at,
    finalization_source = u.finalization_source
  FROM jsonb_to_recordset(day_updates) AS u(
    id uuid,
    status public.monk_day_status,
    finalized_at timestamptz,
    finalization_source public.monk_finalization_source
  )
  WHERE day.id = u.id
    AND day.status = 'in_progress';
END;
$$;

REVOKE ALL ON FUNCTION public.catch_up_missed_days_tx(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.catch_up_missed_days_tx(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.catch_up_missed_days_tx(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.catch_up_missed_days_tx(jsonb) TO service_role;

COMMENT ON FUNCTION public.catch_up_missed_days_tx(jsonb) IS
  'Inserts missed monk_days, snapshots habit logs, and finalizes open days in one transaction. Used by catchUpMissedDays.';
