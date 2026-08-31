// Hand-written Supabase types for the Monk Mode + study-plan domain.
// Merged into the shared `Database` type in `./types.ts`.

export type MonkResetRule = "on_any_fail" | "consecutive_fails" | "fails_in_window";

export type MonkChallengeStatus = "active" | "failed" | "completed" | "abandoned";

export type MonkDayStatus = "in_progress" | "passed" | "failed";

export type MonkFinalizationSource = "manual" | "automatic" | "system_missed";

export type MonkGoalStatus = "active" | "completed" | "abandoned";

export type MonkOverrideEntityType = "day" | "task" | "habit_log" | "app_usage";

export type StudyPlanStatus = "active" | "completed" | "archived";

export type StudyPlanSource = "seeded" | "custom";

export type StudyItemKind = "resource" | "build" | "task";

export type MonkSettings = {
  user_id: string;
  timezone: string;
  social_media_limit_minutes: number;
  max_mandatory_failures_allowed: number;
  reset_rule: MonkResetRule;
  reset_consecutive_count: number | null;
  reset_window_days: number | null;
  reset_window_fail_count: number | null;
  created_at: string;
  updated_at: string;
};

export type MonkChallenge = {
  id: string;
  user_id: string;
  attempt_number: number;
  started_on: string;
  target_days: number;
  status: MonkChallengeStatus;
  ended_on: string | null;
  ended_day_number: number | null;
  successful_days_count: number;
  social_media_limit_minutes: number;
  max_mandatory_failures_allowed: number;
  reset_rule: MonkResetRule;
  reset_consecutive_count: number | null;
  reset_window_days: number | null;
  reset_window_fail_count: number | null;
  created_at: string;
  updated_at: string;
};

export type MonkDay = {
  id: string;
  challenge_id: string;
  user_id: string;
  date: string;
  day_number: number;
  status: MonkDayStatus;
  finalized_at: string | null;
  finalization_source: MonkFinalizationSource | null;
  social_media_limit_minutes: number;
  social_media_actual_minutes: number | null;
  gaming_limit_minutes: number;
  gaming_actual_minutes: number | null;
  accomplished: string | null;
  failed_to_do: string | null;
  why_failed: string | null;
  improve_tomorrow: string | null;
  created_at: string;
  updated_at: string;
};

export type MonkHabit = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  sort_order: number;
  target_value: number | null;
  target_unit: string | null;
  created_at: string;
  updated_at: string;
};

export type MonkHabitLog = {
  id: string;
  day_id: string;
  habit_id: string;
  is_completed: boolean;
  completed_at: string | null;
  is_mandatory_snapshot: boolean;
  target_value_snapshot: number | null;
  target_unit_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

export type MonkTask = {
  id: string;
  day_id: string;
  user_id: string;
  title: string;
  is_mandatory: boolean;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
  study_item_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MonkAppUsage = {
  id: string;
  day_id: string;
  app_name: string;
  minutes: number;
  created_at: string;
  updated_at: string;
};

export type MonkGoal = {
  id: string;
  user_id: string;
  title: string;
  target_date: string | null;
  status: MonkGoalStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MonkCommitment = {
  id: string;
  day_id: string;
  rank: number;
  title: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type MonkOverride = {
  id: string;
  user_id: string;
  day_id: string;
  entity_type: MonkOverrideEntityType;
  entity_id: string;
  field: string;
  previous_value: unknown;
  new_value: unknown;
  reason: string;
  created_at: string;
};

export type StudyPlan = {
  id: string;
  user_id: string;
  title: string;
  starts_on: string | null;
  status: StudyPlanStatus;
  source: StudyPlanSource;
  created_at: string;
  updated_at: string;
};

export type StudyPlanWeek = {
  id: string;
  plan_id: string;
  week_number: number;
  title: string;
  focus: string | null;
  build_target: string | null;
  created_at: string;
};

export type StudyPlanItem = {
  id: string;
  week_id: string;
  kind: StudyItemKind;
  title: string;
  url: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type MonkTables = {
  monk_settings: TableDef<
    MonkSettings,
    Omit<
      MonkSettings,
      | "timezone"
      | "social_media_limit_minutes"
      | "max_mandatory_failures_allowed"
      | "reset_rule"
      | "reset_consecutive_count"
      | "reset_window_days"
      | "reset_window_fail_count"
      | "created_at"
      | "updated_at"
    > & {
      timezone?: string;
      social_media_limit_minutes?: number;
      max_mandatory_failures_allowed?: number;
      reset_rule?: MonkResetRule;
      reset_consecutive_count?: number | null;
      reset_window_days?: number | null;
      reset_window_fail_count?: number | null;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkSettings, "user_id">>
  >;
  monk_challenges: TableDef<
    MonkChallenge,
    Omit<
      MonkChallenge,
      | "id"
      | "target_days"
      | "status"
      | "ended_on"
      | "ended_day_number"
      | "successful_days_count"
      | "reset_consecutive_count"
      | "reset_window_days"
      | "reset_window_fail_count"
      | "created_at"
      | "updated_at"
    > & {
      id?: string;
      target_days?: number;
      status?: MonkChallengeStatus;
      ended_on?: string | null;
      ended_day_number?: number | null;
      successful_days_count?: number;
      reset_consecutive_count?: number | null;
      reset_window_days?: number | null;
      reset_window_fail_count?: number | null;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkChallenge, "id">>
  >;
  monk_days: TableDef<
    MonkDay,
    Omit<
      MonkDay,
      | "id"
      | "status"
      | "finalized_at"
      | "finalization_source"
      | "social_media_actual_minutes"
      | "gaming_limit_minutes"
      | "gaming_actual_minutes"
      | "accomplished"
      | "failed_to_do"
      | "why_failed"
      | "improve_tomorrow"
      | "created_at"
      | "updated_at"
    > & {
      id?: string;
      status?: MonkDayStatus;
      finalized_at?: string | null;
      finalization_source?: MonkFinalizationSource | null;
      social_media_actual_minutes?: number | null;
      gaming_limit_minutes?: number;
      gaming_actual_minutes?: number | null;
      accomplished?: string | null;
      failed_to_do?: string | null;
      why_failed?: string | null;
      improve_tomorrow?: string | null;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkDay, "id">>
  >;
  monk_habits: TableDef<
    MonkHabit,
    Omit<
      MonkHabit,
      | "id"
      | "description"
      | "is_mandatory"
      | "is_active"
      | "sort_order"
      | "target_value"
      | "target_unit"
      | "created_at"
      | "updated_at"
    > & {
      id?: string;
      description?: string | null;
      is_mandatory?: boolean;
      is_active?: boolean;
      sort_order?: number;
      target_value?: number | null;
      target_unit?: string | null;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkHabit, "id">>
  >;
  monk_habit_logs: TableDef<
    MonkHabitLog,
    Omit<
      MonkHabitLog,
      | "id"
      | "is_completed"
      | "completed_at"
      | "target_value_snapshot"
      | "target_unit_snapshot"
      | "created_at"
      | "updated_at"
    > & {
      id?: string;
      is_completed?: boolean;
      completed_at?: string | null;
      target_value_snapshot?: number | null;
      target_unit_snapshot?: string | null;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkHabitLog, "id">>
  >;
  monk_tasks: TableDef<
    MonkTask,
    Omit<
      MonkTask,
      | "id"
      | "is_mandatory"
      | "is_completed"
      | "completed_at"
      | "sort_order"
      | "study_item_id"
      | "created_at"
      | "updated_at"
    > & {
      id?: string;
      is_mandatory?: boolean;
      is_completed?: boolean;
      completed_at?: string | null;
      sort_order?: number;
      study_item_id?: string | null;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkTask, "id">>
  >;
  monk_app_usage: TableDef<
    MonkAppUsage,
    Omit<MonkAppUsage, "id" | "created_at" | "updated_at"> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkAppUsage, "id">>
  >;
  monk_goals: TableDef<
    MonkGoal,
    Omit<
      MonkGoal,
      "id" | "target_date" | "status" | "sort_order" | "created_at" | "updated_at"
    > & {
      id?: string;
      target_date?: string | null;
      status?: MonkGoalStatus;
      sort_order?: number;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkGoal, "id">>
  >;
  monk_commitments: TableDef<
    MonkCommitment,
    Omit<MonkCommitment, "id" | "is_completed" | "created_at" | "updated_at"> & {
      id?: string;
      is_completed?: boolean;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<MonkCommitment, "id">>
  >;
  monk_overrides: TableDef<
    MonkOverride,
    Omit<MonkOverride, "id" | "previous_value" | "new_value" | "created_at"> & {
      id?: string;
      previous_value?: unknown;
      new_value?: unknown;
      created_at?: string;
    },
    Partial<Omit<MonkOverride, "id">>
  >;
  study_plans: TableDef<
    StudyPlan,
    Omit<
      StudyPlan,
      "id" | "starts_on" | "status" | "source" | "created_at" | "updated_at"
    > & {
      id?: string;
      starts_on?: string | null;
      status?: StudyPlanStatus;
      source?: StudyPlanSource;
      created_at?: string;
      updated_at?: string;
    },
    Partial<Omit<StudyPlan, "id">>
  >;
  study_plan_weeks: TableDef<
    StudyPlanWeek,
    Omit<StudyPlanWeek, "id" | "focus" | "build_target" | "created_at"> & {
      id?: string;
      focus?: string | null;
      build_target?: string | null;
      created_at?: string;
    },
    Partial<Omit<StudyPlanWeek, "id">>
  >;
  study_plan_items: TableDef<
    StudyPlanItem,
    Omit<StudyPlanItem, "id" | "url" | "is_primary" | "sort_order" | "created_at"> & {
      id?: string;
      url?: string | null;
      is_primary?: boolean;
      sort_order?: number;
      created_at?: string;
    },
    Partial<Omit<StudyPlanItem, "id">>
  >;
};

export type MonkEnums = {
  monk_reset_rule: MonkResetRule;
  monk_challenge_status: MonkChallengeStatus;
  monk_day_status: MonkDayStatus;
  monk_finalization_source: MonkFinalizationSource;
  monk_goal_status: MonkGoalStatus;
  monk_override_entity_type: MonkOverrideEntityType;
  study_plan_status: StudyPlanStatus;
  study_plan_source: StudyPlanSource;
  study_item_kind: StudyItemKind;
};
