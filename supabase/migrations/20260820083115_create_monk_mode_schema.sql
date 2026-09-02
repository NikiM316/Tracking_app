-- Monk Mode + study-plan schema.
-- RLS enabled with no policies (same as fitness/finance until Auth is wired).
-- Service role bypasses RLS for the current single-user app.

CREATE TYPE monk_reset_rule AS ENUM ('on_any_fail', 'consecutive_fails', 'fails_in_window');
CREATE TYPE monk_challenge_status AS ENUM ('active', 'failed', 'completed', 'abandoned');
CREATE TYPE monk_day_status AS ENUM ('in_progress', 'passed', 'failed');
CREATE TYPE monk_finalization_source AS ENUM ('manual', 'automatic', 'system_missed');
CREATE TYPE monk_goal_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE monk_override_entity_type AS ENUM ('day', 'task', 'habit_log', 'app_usage');
CREATE TYPE study_plan_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE study_plan_source AS ENUM ('seeded', 'custom');
CREATE TYPE study_item_kind AS ENUM ('resource', 'build', 'task');

CREATE OR REPLACE FUNCTION monk_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE monk_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'Europe/Sofia',
  social_media_limit_minutes integer NOT NULL DEFAULT 30 CHECK (social_media_limit_minutes >= 0),
  max_mandatory_failures_allowed integer NOT NULL DEFAULT 0 CHECK (max_mandatory_failures_allowed >= 0),
  reset_rule monk_reset_rule NOT NULL DEFAULT 'on_any_fail',
  reset_consecutive_count integer CHECK (reset_consecutive_count IS NULL OR reset_consecutive_count >= 1),
  reset_window_days integer CHECK (reset_window_days IS NULL OR reset_window_days >= 1),
  reset_window_fail_count integer CHECK (reset_window_fail_count IS NULL OR reset_window_fail_count >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE monk_settings IS 'Per-user Monk Mode defaults copied onto each new challenge at start.';

CREATE TABLE monk_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number >= 1),
  started_on date NOT NULL,
  target_days integer NOT NULL DEFAULT 180 CHECK (target_days >= 1),
  status monk_challenge_status NOT NULL DEFAULT 'active',
  ended_on date,
  ended_day_number integer CHECK (ended_day_number IS NULL OR ended_day_number >= 1),
  successful_days_count integer NOT NULL DEFAULT 0 CHECK (successful_days_count >= 0),
  social_media_limit_minutes integer NOT NULL CHECK (social_media_limit_minutes >= 0),
  max_mandatory_failures_allowed integer NOT NULL CHECK (max_mandatory_failures_allowed >= 0),
  reset_rule monk_reset_rule NOT NULL,
  reset_consecutive_count integer CHECK (reset_consecutive_count IS NULL OR reset_consecutive_count >= 1),
  reset_window_days integer CHECK (reset_window_days IS NULL OR reset_window_days >= 1),
  reset_window_fail_count integer CHECK (reset_window_fail_count IS NULL OR reset_window_fail_count >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attempt_number),
  CHECK (
    (status = 'active' AND ended_on IS NULL AND ended_day_number IS NULL)
    OR (status <> 'active')
  )
);

COMMENT ON TABLE monk_challenges IS 'One row per 180-day attempt. Historical attempts are never deleted.';

CREATE UNIQUE INDEX monk_challenges_one_active_per_user
  ON monk_challenges (user_id)
  WHERE status = 'active';

CREATE INDEX monk_challenges_user_id_status_idx
  ON monk_challenges (user_id, status);

CREATE TABLE monk_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES monk_challenges(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  day_number integer NOT NULL CHECK (day_number >= 1),
  status monk_day_status NOT NULL DEFAULT 'in_progress',
  finalized_at timestamptz,
  finalization_source monk_finalization_source,
  social_media_limit_minutes integer NOT NULL CHECK (social_media_limit_minutes >= 0),
  social_media_actual_minutes integer CHECK (social_media_actual_minutes IS NULL OR social_media_actual_minutes >= 0),
  accomplished text,
  failed_to_do text,
  why_failed text,
  improve_tomorrow text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, date),
  UNIQUE (challenge_id, day_number),
  CHECK (
    (status = 'in_progress' AND finalized_at IS NULL AND finalization_source IS NULL)
    OR (status <> 'in_progress' AND finalized_at IS NOT NULL AND finalization_source IS NOT NULL)
  )
);

COMMENT ON TABLE monk_days IS 'Per-calendar-day execution record within a challenge attempt. Created on first open, not pre-inserted.';

CREATE INDEX monk_days_user_id_date_idx ON monk_days (user_id, date);
CREATE INDEX monk_days_challenge_id_day_number_idx ON monk_days (challenge_id, day_number);

CREATE TABLE monk_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name <> ''),
  description text,
  is_mandatory boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  target_value numeric,
  target_unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_value IS NULL OR target_value >= 0)
);

CREATE INDEX monk_habits_user_id_active_sort_idx
  ON monk_habits (user_id, is_active, sort_order);

CREATE TABLE monk_habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES monk_days(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES monk_habits(id) ON DELETE RESTRICT,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  is_mandatory_snapshot boolean NOT NULL,
  target_value_snapshot numeric,
  target_unit_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_id, habit_id),
  CHECK (
    (is_completed = false AND completed_at IS NULL)
    OR (is_completed = true AND completed_at IS NOT NULL)
  )
);

CREATE INDEX monk_habit_logs_day_id_idx ON monk_habit_logs (day_id);
CREATE INDEX monk_habit_logs_habit_id_idx ON monk_habit_logs (habit_id);

CREATE TABLE study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (title <> ''),
  starts_on date,
  status study_plan_status NOT NULL DEFAULT 'active',
  source study_plan_source NOT NULL DEFAULT 'custom',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE study_plans IS 'Loosely coupled study curriculum. Challenge resets do not reset the study plan.';

CREATE INDEX study_plans_user_id_status_idx ON study_plans (user_id, status);

CREATE TABLE study_plan_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL CHECK (week_number >= 1),
  title text NOT NULL CHECK (title <> ''),
  focus text,
  build_target text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, week_number)
);

CREATE TABLE study_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES study_plan_weeks(id) ON DELETE CASCADE,
  kind study_item_kind NOT NULL,
  title text NOT NULL CHECK (title <> ''),
  url text,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX study_plan_items_week_id_sort_idx ON study_plan_items (week_id, sort_order);

CREATE TABLE monk_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES monk_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (title <> ''),
  is_mandatory boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  study_item_id uuid REFERENCES study_plan_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (is_completed = false AND completed_at IS NULL)
    OR (is_completed = true AND completed_at IS NOT NULL)
  )
);

CREATE INDEX monk_tasks_day_id_sort_idx ON monk_tasks (day_id, sort_order);
CREATE INDEX monk_tasks_study_item_id_idx ON monk_tasks (study_item_id);

CREATE TABLE monk_app_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES monk_days(id) ON DELETE CASCADE,
  app_name text NOT NULL CHECK (app_name <> ''),
  minutes integer NOT NULL CHECK (minutes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_id, app_name)
);

CREATE TABLE monk_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (title <> ''),
  target_date date,
  status monk_goal_status NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX monk_goals_user_id_status_idx ON monk_goals (user_id, status);

CREATE TABLE monk_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES monk_days(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank >= 1 AND rank <= 3),
  title text NOT NULL CHECK (title <> ''),
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day_id, rank)
);

CREATE TABLE monk_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES monk_days(id) ON DELETE RESTRICT,
  entity_type monk_override_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  field text NOT NULL CHECK (field <> ''),
  previous_value jsonb,
  new_value jsonb,
  reason text NOT NULL CHECK (reason <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX monk_overrides_day_id_idx ON monk_overrides (day_id);
CREATE INDEX monk_overrides_user_id_created_at_idx ON monk_overrides (user_id, created_at DESC);

ALTER TABLE monk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_app_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monk_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER monk_settings_set_updated_at
  BEFORE UPDATE ON monk_settings
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER monk_challenges_set_updated_at
  BEFORE UPDATE ON monk_challenges
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER monk_days_set_updated_at
  BEFORE UPDATE ON monk_days
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER monk_habits_set_updated_at
  BEFORE UPDATE ON monk_habits
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER monk_habit_logs_set_updated_at
  BEFORE UPDATE ON monk_habit_logs
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER monk_tasks_set_updated_at
  BEFORE UPDATE ON monk_tasks
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER monk_app_usage_set_updated_at
  BEFORE UPDATE ON monk_app_usage
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER monk_goals_set_updated_at
  BEFORE UPDATE ON monk_goals
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER monk_commitments_set_updated_at
  BEFORE UPDATE ON monk_commitments
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

CREATE TRIGGER study_plans_set_updated_at
  BEFORE UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION monk_set_updated_at();

INSERT INTO monk_settings (user_id)
VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE
  v_user uuid := '00000000-0000-0000-0000-000000000000';
  v_plan uuid;
  v_week uuid;
BEGIN
  INSERT INTO study_plans (user_id, title, status, source)
  VALUES (v_user, '6-Week Engineering Study Plan', 'active', 'seeded')
  RETURNING id INTO v_plan;

  INSERT INTO study_plan_weeks (plan_id, week_number, title, focus, build_target)
  VALUES (
    v_plan, 1,
    'AI-Assisted Development & Context Engineering',
    'Shift from using AI as a basic autocomplete tool to orchestrating AI agents, managing multi-file context, and enforcing architectural standards.',
    'Create a production-grade .cursorrules file and scaffold a practice app from a PRD in under 48 hours using Plan Mode.'
  )
  RETURNING id INTO v_week;

  INSERT INTO study_plan_items (week_id, kind, title, url, is_primary, sort_order) VALUES
    (v_week, 'resource', 'Official Cursor Documentation & Tutorials', 'https://cursor.com/learn', true, 0),
    (v_week, 'resource', 'Anthropic Interactive Prompt Engineering Tutorial', 'https://github.com/anthropics/prompt-eng-interactive-tutorial', true, 1),
    (v_week, 'resource', 'DeepLearning.AI: Prompt Engineering for Developers', NULL, false, 2),
    (v_week, 'build', 'Draft a PRD defining Owner, Member, and End-User (Voter) roles', NULL, true, 3),
    (v_week, 'build', 'Scaffold Next.js App Router with Tailwind CSS and a custom .cursorrules file', NULL, true, 4),
    (v_week, 'build', 'Use Plan Mode to wireframe Admin Dashboard + Public Board views', NULL, true, 5);

  INSERT INTO study_plan_weeks (plan_id, week_number, title, focus, build_target)
  VALUES (
    v_plan, 2,
    'JavaScript / TypeScript + React & Next.js Fundamentals',
    'Understand the execution environment. Learn enough core principles so you can read, debug, and refactor AI-generated code rather than blindly accepting hallucinations.',
    'Refactor the Week 1 application to strict TypeScript, App Router conventions, and cleanly separated Server vs Client components.'
  )
  RETURNING id INTO v_week;

  INSERT INTO study_plan_items (week_id, kind, title, url, is_primary, sort_order) VALUES
    (v_week, 'resource', 'JavaScript.info — Promises, async/await, Event Loop, Array methods, Closures', 'https://javascript.info', true, 0),
    (v_week, 'resource', 'React.dev — Describing the UI and Managing State', 'https://react.dev', true, 1),
    (v_week, 'resource', 'Next.js Learn — App Router, Server vs Client Components, Server Actions', 'https://nextjs.org/learn', true, 2),
    (v_week, 'resource', 'Total TypeScript — Beginner essentials', 'https://www.totaltypescript.com', false, 3),
    (v_week, 'build', 'Build dynamic workspace routing for public board and protected admin views', NULL, true, 4),
    (v_week, 'build', 'Build an interactive upvote button with optimistic UI', NULL, true, 5),
    (v_week, 'build', 'Write strict TypeScript interfaces for Workspace, FeaturePost, Tag, and User', NULL, true, 6);

  INSERT INTO study_plan_weeks (plan_id, week_number, title, focus, build_target)
  VALUES (
    v_plan, 3,
    'Data Structures & Algorithms',
    'Build intuition for computational complexity and operational costs without grinding LeetCode all day.',
    'Identify two nested O(n²) lookups in the app and refactor them to hash-map O(1) or binary-search O(log n) patterns.'
  )
  RETURNING id INTO v_week;

  INSERT INTO study_plan_items (week_id, kind, title, url, is_primary, sort_order) VALUES
    (v_week, 'resource', 'NeetCode.io Roadmap — Core Concepts', 'https://neetcode.io', true, 0),
    (v_week, 'resource', 'Big-O Cheat Sheet', 'https://www.bigocheatsheet.com', true, 1),
    (v_week, 'resource', 'VisuAlgo.net — Interactive data-structure visualizer', 'https://visualgo.net', false, 2),
    (v_week, 'build', 'Duplicate detection: prefix/token search that suggests existing feature posts', NULL, true, 3),
    (v_week, 'build', 'Triage priority queue: rank backlog by upvotes × impact / effort', NULL, true, 4);

  INSERT INTO study_plan_weeks (plan_id, week_number, title, focus, build_target)
  VALUES (
    v_plan, 4,
    'SQL & Database Engineering',
    'Design resilient relational schemas, write optimized SQL, and configure bulletproof security policies.',
    'Design and deploy a normalized PostgreSQL schema in Supabase with RLS so users can only read/write their own records.'
  )
  RETURNING id INTO v_week;

  INSERT INTO study_plan_items (week_id, kind, title, url, is_primary, sort_order) VALUES
    (v_week, 'resource', 'PostgreSQL Tutorial — tables, FKs, normalization, joins, indexes, transactions', 'https://www.postgresqltutorial.com', true, 0),
    (v_week, 'resource', 'Supabase Documentation — Database, Auth, RLS, triggers, functions', 'https://supabase.com/docs', true, 1),
    (v_week, 'resource', 'SQLBolt — interactive SQL practice', 'https://sqlbolt.com', false, 2),
    (v_week, 'build', 'Create normalized tables: workspaces, memberships, posts, votes, categories', NULL, true, 3),
    (v_week, 'build', 'Unique composite constraint on votes(post_id, user_id)', NULL, true, 4),
    (v_week, 'build', 'Write RLS for public SELECT and owner-only status updates', NULL, true, 5);

  INSERT INTO study_plan_weeks (plan_id, week_number, title, focus, build_target)
  VALUES (
    v_plan, 5,
    'HTTP, APIs & Backend Security',
    'Build secure, reliable communication layers between frontend, backend, and third-party services.',
    'Replace mock data with Server Actions, add spam rate-limiting, and expose a public API key endpoint.'
  )
  RETURNING id INTO v_week;

  INSERT INTO study_plan_items (week_id, kind, title, url, is_primary, sort_order) VALUES
    (v_week, 'resource', 'MDN Web Docs: HTTP & Fetch API', 'https://developer.mozilla.org/en-US/docs/Web/HTTP', true, 0),
    (v_week, 'resource', 'Postman Academy / RESTful API Guide', NULL, true, 1),
    (v_week, 'resource', 'Supabase Auth / JWT.io — tokens, cookies, server-side authorization', 'https://jwt.io', true, 2),
    (v_week, 'resource', 'OWASP Top 10 API Security Risks', 'https://owasp.org/API-Security/', false, 3),
    (v_week, 'build', 'Connect the frontend to Supabase with Server Actions and structured errors', NULL, true, 4),
    (v_week, 'build', 'Add a lightweight IP-based rate limiter on submissions', NULL, true, 5),
    (v_week, 'build', 'Build /api/v1/[workspaceSlug]/posts with API-key auth', NULL, true, 6);

  INSERT INTO study_plan_weeks (plan_id, week_number, title, focus, build_target)
  VALUES (
    v_plan, 6,
    'System Design & Startup Validation',
    'Synthesize engineering scalability with market-driven business execution.',
    'Produce an end-to-end launch blueprint for the B2B Multi-Tenant Feedback & Roadmap Portal and deploy it.'
  )
  RETURNING id INTO v_week;

  INSERT INTO study_plan_items (week_id, kind, title, url, is_primary, sort_order) VALUES
    (v_week, 'resource', 'The System Design Primer', 'https://github.com/donnemartin/system-design-primer', true, 0),
    (v_week, 'resource', 'ByteByteGo — visual architectures of scalable web apps', NULL, true, 1),
    (v_week, 'resource', 'Y Combinator Startup School — evaluate ideas and talk to users', 'https://www.startupschool.org', true, 2),
    (v_week, 'resource', 'The Mom Test by Rob Fitzpatrick', NULL, false, 3),
    (v_week, 'build', 'Configure ISR or edge caching on the public roadmap', NULL, true, 4),
    (v_week, 'build', 'Deploy the project on Vercel', NULL, true, 5),
    (v_week, 'build', 'Share the live link and collect founder/developer feedback', NULL, true, 6);
END $$;
