alter table public.sets
  add column rest_seconds integer;

alter table public.sets
  add constraint sets_rest_seconds_check check (rest_seconds is null or rest_seconds >= 0);

comment on column public.sets.rest_seconds is 'Elapsed rest time in seconds since the previous set in the workout was saved.';
