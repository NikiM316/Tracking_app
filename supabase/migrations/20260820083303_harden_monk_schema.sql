CREATE OR REPLACE FUNCTION monk_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE INDEX monk_tasks_user_id_idx ON monk_tasks (user_id);
