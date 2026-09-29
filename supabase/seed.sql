-- Seed data for a fresh database. Run automatically by `supabase db reset`.
--
-- Scope note: this file only seeds the exercise catalog. The other two seeded
-- data sets already live inside migrations and must not be duplicated here:
--   * 21 default finance categories
--       -> 20260807073934_seed_finance_defaults_for_placeholder_user.sql
--   * monk_settings + the 6-week study plan (6 weeks, 38 items)
--       -> 20260820083115_create_monk_mode_schema.sql
--
-- The 50 exercises below are the catalog the 14-day program references by slug
-- (see lib/program/cycle.ts). Idempotent: safe to re-run.

INSERT INTO exercises (slug, name, category) VALUES
  ('atg-split-squats', 'ATG Split Squats', 'barbell'),
  ('barbell-back-squat', 'Barbell Back Squat', 'barbell'),
  ('bench-press', 'Bench Press', 'barbell'),
  ('bulgarian-split-squats', 'Bulgarian Split Squats', 'barbell'),
  ('chest-supported-row', 'Chest-Supported Row', 'barbell'),
  ('conventional-deadlift', 'Conventional Deadlift', 'barbell'),
  ('db-goblet-squat', 'DB Goblet Squat', 'barbell'),
  ('face-pulls', 'Face Pulls', 'barbell'),
  ('flat-db-bench-press', 'Flat DB Bench Press', 'barbell'),
  ('front-squat', 'Front Squat', 'barbell'),
  ('hammer-curls', 'Hammer Curls', 'barbell'),
  ('heavy-db-row', 'Heavy DB Row', 'barbell'),
  ('high-cable-triceps-extensions', 'High Cable Triceps Extensions', 'barbell'),
  ('incline-biceps-curls', 'Incline Biceps Curls', 'barbell'),
  ('incline-dumbbell-curls', 'Incline Dumbbell Curls', 'barbell'),
  ('incline-dumbbell-press', 'Incline Dumbbell Press', 'barbell'),
  ('incline-skull-crushers', 'Incline Skull Crushers', 'barbell'),
  ('lateral-raises', 'Lateral Raises', 'barbell'),
  ('leg-curls', 'Leg Curls', 'barbell'),
  ('leg-extension', 'Leg Extension', 'barbell'),
  ('lu-raises', 'LU Raises', 'barbell'),
  ('machine-flys', 'Machine Flys', 'barbell'),
  ('overhead-cable-triceps-extension', 'Overhead Cable Triceps Extension', 'barbell'),
  ('overhead-press', 'Overhead Press', 'barbell'),
  ('pendlay-barbell-rows', 'Pendlay Barbell Rows', 'barbell'),
  ('rear-delt-cable-flys', 'Rear Delt Cable Flys', 'barbell'),
  ('romanian-deadlift', 'Romanian Deadlift', 'barbell'),
  ('rope-tricep-pushdowns', 'Rope Tricep Pushdowns', 'barbell'),
  ('seated-cable-row', 'Seated Cable Row', 'barbell'),
  ('seated-calf-raises', 'Seated Calf Raises', 'barbell'),
  ('seated-leg-curl', 'Seated Leg Curl', 'barbell'),
  ('single-leg-rdl-dumbbell', 'Single Leg RDL Dumbbell', 'barbell'),
  ('standing-calf-raises', 'Standing Calf Raises', 'barbell'),
  ('standing-landmine-press', 'Standing Landmine Press', 'barbell'),
  ('straight-arm-lat-pulldown', 'Straight-Arm Lat Pulldown', 'barbell'),
  ('weighted-cossack-squats', 'Weighted Cossack Squats', 'barbell'),
  ('weighted-walking-lunges', 'Weighted Walking Lunges', 'barbell'),
  ('zottman-curls', 'Zottman Curls', 'barbell'),
  ('archer-push-ups', 'Archer Push-Ups', 'calisthenics'),
  ('handstand-push-up', 'Handstand Push-up', 'calisthenics'),
  ('muscle-up', 'Muscle-up', 'calisthenics'),
  ('neutral-grip-pull-ups', 'Neutral Grip Pull-Ups', 'calisthenics'),
  ('nordic-hamstring-curls', 'Nordic Hamstring Curls', 'calisthenics'),
  ('parallel-bar-dips', 'Parallel Bar Dips', 'calisthenics'),
  ('pseudo-push-ups', 'Pseudo Push Ups', 'calisthenics'),
  ('strict-hollow-body-pull-ups', 'Strict Hollow-Body Pull-Ups', 'calisthenics'),
  ('wall-hspu-negatives', 'Wall HSPU Negatives', 'calisthenics'),
  ('weighted-chin-ups', 'Weighted Chin-Ups', 'calisthenics'),
  ('weighted-dips', 'Weighted Dips', 'calisthenics'),
  ('weighted-pull-ups', 'Weighted Pull-Ups', 'calisthenics')
ON CONFLICT (slug) DO NOTHING;
