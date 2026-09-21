import type { Enums, Tables } from "./database.generated";

export type MonkChallengeStatus = Enums<"monk_challenge_status">;
export type MonkDayStatus = Enums<"monk_day_status">;
export type MonkFinalizationSource = Enums<"monk_finalization_source">;
export type StudyPlanStatus = Enums<"study_plan_status">;
export type StudyPlanSource = Enums<"study_plan_source">;
export type StudyItemKind = Enums<"study_item_kind">;

export type MonkSettings = Tables<"monk_settings">;
export type MonkChallenge = Tables<"monk_challenges">;
export type MonkDay = Tables<"monk_days">;
export type MonkHabit = Tables<"monk_habits">;
export type MonkHabitLog = Tables<"monk_habit_logs">;
export type MonkTask = Tables<"monk_tasks">;
export type StudyPlan = Tables<"study_plans">;
export type StudyPlanWeek = Tables<"study_plan_weeks">;
export type StudyPlanItem = Tables<"study_plan_items">;

/** JSON payload for `catch_up_missed_days_tx`. Application-level, not a table row. */
export type CatchUpMissedDaysPayload = {
  missing_days: Array<{
    id: string;
    challenge_id: string;
    user_id: string;
    date: string;
    day_number: number;
    status: "failed";
    finalized_at: string;
    finalization_source: "system_missed";
    social_media_limit_minutes: number;
    gaming_limit_minutes: number;
  }>;
  habit_logs: Array<{
    day_id: string;
    habit_id: string;
    is_mandatory_snapshot: boolean;
    target_value_snapshot: number | null;
    target_unit_snapshot: string | null;
  }>;
  day_updates: Array<{
    id: string;
    status: "passed" | "failed";
    finalized_at: string;
    finalization_source: "automatic";
  }>;
};
