alter table public.workouts
  add column water_ml integer not null default 0;

alter table public.workouts
  add constraint workouts_water_ml_check check (water_ml >= 0);

comment on column public.workouts.water_ml is 'Daily water intake in milliliters for this workout/day log.';
