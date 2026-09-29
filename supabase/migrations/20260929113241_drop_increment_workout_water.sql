-- Water tracking is gone from the app. Keep workouts.water_ml.
drop function if exists public.increment_workout_water(uuid, integer);
