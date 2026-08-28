import type {
  MonkChallenge,
  MonkDay,
  MonkHabit,
  MonkHabitLog,
  MonkSettings,
  MonkTask,
  StudyPlanItem,
} from "@/lib/supabase/monk-types";
import type { ChallengeStreaks, DayScore } from "@/features/monk/lib/accountability";

export type HabitDraft = {
  name: string;
  isMandatory: boolean;
  targetValue: number | null;
  targetUnit: string | null;
};

export type StudyWeekPanel = {
  planId: string;
  planTitle: string;
  weekId: string;
  weekNumber: number;
  totalWeeks: number;
  title: string;
  focus: string | null;
  buildTarget: string | null;
  items: StudyPlanItem[];
  completed: boolean;
};

export type ClosedChallengeSummary = {
  challenge: MonkChallenge;
  canStartOn: string;
  canStartNow: boolean;
};

export type TodayPageData =
  | {
      mode: "setup";
      settings: MonkSettings;
      habits: MonkHabit[];
    }
  | {
      mode: "reset_required";
      settings: MonkSettings;
      lastChallenge: ClosedChallengeSummary;
      habits: MonkHabit[];
    }
  | {
      mode: "completed";
      settings: MonkSettings;
      lastChallenge: ClosedChallengeSummary;
      habits: MonkHabit[];
    }
  | {
      mode: "today";
      settings: MonkSettings;
      challenge: MonkChallenge;
      day: MonkDay;
      isLocked: boolean;
      habits: MonkHabitLogView[];
      tasks: MonkTask[];
      score: DayScore;
      streaks: ChallengeStreaks;
      studyWeek: StudyWeekPanel | null;
    };

export type MonkHabitLogView = MonkHabitLog & {
  name: string;
};

export type ChallengeGridCell = {
  dayNumber: number;
  date: string;
  status: "passed" | "failed" | "in_progress" | "future" | "empty";
  isMilestone: boolean;
};

export type ChallengePageData = {
  settings: MonkSettings;
  activeChallenge: MonkChallenge | null;
  focusedChallenge: MonkChallenge | null;
  days: MonkDay[];
  cells: ChallengeGridCell[];
  streaks: ChallengeStreaks | null;
  attempts: MonkChallenge[];
  resetRequired: ClosedChallengeSummary | null;
};

export type HabitPageData = {
  habits: MonkHabit[];
};

export type StartChallengeInput = {
  socialMediaLimitMinutes: number;
  habits?: HabitDraft[];
};

export type ActionResult = { error: string } | { ok: true };
