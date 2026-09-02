ALTER TABLE public.monk_days
  ADD COLUMN gaming_limit_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN gaming_actual_minutes integer,
  ADD CONSTRAINT monk_days_gaming_limit_minutes_check CHECK (gaming_limit_minutes >= 0),
  ADD CONSTRAINT monk_days_gaming_actual_minutes_check CHECK (
    (gaming_actual_minutes IS NULL) OR (gaming_actual_minutes >= 0)
  );
