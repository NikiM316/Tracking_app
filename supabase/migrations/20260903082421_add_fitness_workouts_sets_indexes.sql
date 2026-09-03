-- Fitness query indexes that were missing from the original schema.
--
-- workouts is filtered and ordered as (user_id, date DESC) on every today,
-- history, and analytics load. sets is joined from those workout ids, but
-- Postgres does not index foreign keys automatically.

CREATE INDEX workouts_user_id_date_idx ON workouts (user_id, date DESC);
CREATE INDEX sets_workout_id_idx ON sets (workout_id);
