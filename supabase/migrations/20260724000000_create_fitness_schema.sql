-- Baseline fitness schema (exercises, workouts, sets, exercise_notes).
--
-- NOTE: this migration was reconstructed from the live database on 2026-09-02.
-- The original fitness tables predate the migration history: the earliest
-- recorded migration (20260805080419_add_rest_seconds_to_sets) already ALTERs
-- public.sets, so a fresh database had no way to reach a working state. This
-- file closes that gap and must run before every other migration.
--
-- Columns added by later migrations are intentionally NOT included here:
--   sets.rest_seconds        -> 20260805080419
--   workouts.water_ml        -> 20260805101104
--   increment_workout_water  -> 20260805101128

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- The single-user prototype writes everything against one hardcoded user id.
-- Later seed migrations (finance defaults, monk settings, study plan) insert
-- rows referencing it, so it has to exist before they run.
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'me@fitness.local')
ON CONFLICT (id) DO NOTHING;

CREATE TYPE exercise_category AS ENUM ('barbell', 'calisthenics', 'cardio', 'mobility');
CREATE TYPE set_category AS ENUM ('warmup', 'top_set', 'back_off', 'working_set', 'zone_2');

-- 1. exercises: static catalog keyed by slug, referenced by lib/program/cycle.ts
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category exercise_category NOT NULL,
  created_at timestamptz DEFAULT now(),
  slug text NOT NULL
);
COMMENT ON TABLE exercises IS 'Exercise catalog. slug is the stable key the 14-day program definition references.';

CREATE UNIQUE INDEX exercises_slug_key ON exercises (slug);

-- 2. workouts: one row per user per calendar date
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  cns_readiness integer CHECK (cns_readiness >= 1 AND cns_readiness <= 10),
  cycle_day integer CHECK (cycle_day >= 1 AND cycle_day <= 14),
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
COMMENT ON TABLE workouts IS 'Daily workout log. cycle_day advances from the previous workout rather than from the calendar; completed_at marks the session finished.';

-- 3. sets: individual logged sets within a workout
CREATE TABLE sets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id),
  set_order integer NOT NULL,
  set_category set_category NOT NULL,
  weight_kg numeric,
  reps integer,
  rpe numeric CHECK (rpe >= 1 AND rpe <= 10),
  duration_seconds integer,
  distance_meters integer,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE sets IS 'Logged sets. set_category drives smart warm-up generation and analytics filtering.';

-- 4. exercise_notes: one free-text note per workout/exercise pair
CREATE TABLE exercise_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id, exercise_id)
);
COMMENT ON TABLE exercise_notes IS 'Per-exercise notes for a workout. updated_at is maintained by the application upsert, not a trigger.';

CREATE INDEX exercise_notes_exercise_id_idx ON exercise_notes (exercise_id);

-- RLS is enabled with no permissive policies: anon/authenticated get nothing and
-- the server-side service-role client bypasses RLS. See
-- 20260902071914_lock_down_public_access.sql for the explicit deny-all policies.
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_notes ENABLE ROW LEVEL SECURITY;
