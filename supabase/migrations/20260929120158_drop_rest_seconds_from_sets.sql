-- Rest timers are gone from the app.
alter table public.sets
  drop column if exists rest_seconds;
