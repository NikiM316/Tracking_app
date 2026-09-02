create or replace function public.increment_workout_water(
  p_workout_id uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be a positive integer';
  end if;

  update public.workouts
  set water_ml = water_ml + p_amount
  where id = p_workout_id
  returning water_ml into new_total;

  if new_total is null then
    raise exception 'Workout not found';
  end if;

  return new_total;
end;
$$;
