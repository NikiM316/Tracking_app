import type { MonkChallenge, MonkDay, MonkFinalizationSource } from "@/lib/supabase/monk-types";

export const MILESTONE_DAYS = [7, 30, 60, 90, 120, 180] as const;

export const DEFAULT_GAMING_LIMIT_MINUTES = 30;

export type MandatoryHabitSnapshot = {
  is_mandatory_snapshot: boolean;
  is_completed: boolean;
};

export type MandatoryTaskSnapshot = {
  is_mandatory: boolean;
  is_completed: boolean;
};

export type DayScoreInput = {
  habits: MandatoryHabitSnapshot[];
  tasks: MandatoryTaskSnapshot[];
  socialMediaLimitMinutes: number;
  socialMediaActualMinutes: number | null;
  gamingLimitMinutes: number;
  gamingActualMinutes: number | null;
  maxMandatoryFailuresAllowed: number;
};

export type DayScore = {
  mandatoryCount: number;
  mandatoryFailures: number;
  passed: boolean;
  digitalFastingPassed: boolean;
  socialMediaPassed: boolean;
  gamingPassed: boolean;
};

export function isDigitalFastingPassed(
  actualMinutes: number | null,
  limitMinutes: number,
): boolean {
  return actualMinutes !== null && actualMinutes <= limitMinutes;
}

export function scoreDay(input: DayScoreInput): DayScore {
  const socialMediaPassed = isDigitalFastingPassed(
    input.socialMediaActualMinutes,
    input.socialMediaLimitMinutes,
  );
  const gamingPassed = isDigitalFastingPassed(
    input.gamingActualMinutes,
    input.gamingLimitMinutes,
  );
  const digitalFastingPassed = socialMediaPassed && gamingPassed;

  let mandatoryCount = 1;
  let mandatoryFailures = digitalFastingPassed ? 0 : 1;

  for (const habit of input.habits) {
    if (!habit.is_mandatory_snapshot) continue;
    mandatoryCount += 1;
    if (!habit.is_completed) {
      mandatoryFailures += 1;
    }
  }

  for (const task of input.tasks) {
    if (!task.is_mandatory) continue;
    mandatoryCount += 1;
    if (!task.is_completed) {
      mandatoryFailures += 1;
    }
  }

  return {
    mandatoryCount,
    mandatoryFailures,
    passed: mandatoryFailures <= input.maxMandatoryFailuresAllowed,
    digitalFastingPassed,
    socialMediaPassed,
    gamingPassed,
  };
}

export function shouldResetOnFail(challenge: Pick<MonkChallenge, "reset_rule">): boolean {
  return challenge.reset_rule === "on_any_fail";
}

export type ChallengeStreaks = {
  currentStreak: number;
  bestStreak: number;
  daysPassed: number;
  daysFailed: number;
  dayNumber: number;
  remainingDays: number;
  completionPercent: number;
};

export function computeChallengeStreaks(params: {
  challenge: Pick<
    MonkChallenge,
    "status" | "target_days" | "successful_days_count" | "ended_day_number"
  >;
  days: Pick<MonkDay, "status" | "day_number">[];
  todayDayNumber: number;
  previousBest: number;
}): ChallengeStreaks {
  const daysPassed = params.days.filter((day) => day.status === "passed").length;
  const daysFailed = params.days.filter((day) => day.status === "failed").length;

  const currentStreak =
    params.challenge.status === "active" ? daysPassed : 0;

  const attemptBest =
    params.challenge.status === "active"
      ? daysPassed
      : params.challenge.successful_days_count;

  const bestStreak = Math.max(params.previousBest, attemptBest);
  const dayNumber = Math.min(
    Math.max(params.todayDayNumber, 1),
    params.challenge.target_days,
  );
  const remainingDays = Math.max(params.challenge.target_days - daysPassed, 0);
  const completionPercent = Math.round(
    (daysPassed / params.challenge.target_days) * 100,
  );

  return {
    currentStreak,
    bestStreak,
    daysPassed,
    daysFailed,
    dayNumber,
    remainingDays,
    completionPercent,
  };
}

export function previousBestStreak(
  attempts: Pick<MonkChallenge, "successful_days_count">[],
): number {
  return attempts.reduce(
    (best, attempt) => Math.max(best, attempt.successful_days_count),
    0,
  );
}

export function nextStartDate(params: {
  today: string;
  lastEndedOn: string | null;
}): string {
  if (!params.lastEndedOn) {
    return params.today;
  }

  const earliest = addDaysLocal(params.lastEndedOn, 1);
  return earliest > params.today ? earliest : params.today;
}

function addDaysLocal(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isDayLocked(
  day: Pick<MonkDay, "finalized_at" | "status">,
): boolean {
  return day.finalized_at !== null || day.status !== "in_progress";
}

export function finalizationSourceForMissingDay(
  hadExistingRow: boolean,
): MonkFinalizationSource {
  return hadExistingRow ? "automatic" : "system_missed";
}
