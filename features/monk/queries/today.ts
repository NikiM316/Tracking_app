import "server-only";

import {
  computeChallengeStreaks,
  isDayLocked,
  nextStartDate,
  previousBestStreak,
  scoreDay,
} from "@/features/monk/lib/accountability";
import {
  ensureSettings,
  ensureTodayDay,
  getActiveStudyPlan,
  listChallenges,
  listDaysForChallenge,
  listHabitLogs,
  listHabits,
  listStudyItems,
  listStudyWeeks,
  listTasks,
  prepareActiveChallenge,
} from "@/features/monk/lib/challenge-ops";
import { getTodayInTimezone } from "@/features/monk/lib/dates";
import type {
  ClosedChallengeSummary,
  MonkHabitLogView,
  StudyWeekPanel,
  TodayPageData,
} from "@/features/monk/types";
import type { MonkChallenge, MonkHabit } from "@/lib/supabase/monk-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";

function toHabitLogViews(
  logs: Awaited<ReturnType<typeof listHabitLogs>>,
  habits: MonkHabit[],
): MonkHabitLogView[] {
  const nameById = new Map(habits.map((habit) => [habit.id, habit.name]));
  return [...logs]
    .map((log) => ({
      ...log,
      name: nameById.get(log.habit_id) ?? "Habit",
    }))
    .sort((a, b) => {
      const orderA = habits.findIndex((habit) => habit.id === a.habit_id);
      const orderB = habits.findIndex((habit) => habit.id === b.habit_id);
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });
}

function closedSummary(
  challenge: MonkChallenge,
  today: string,
): ClosedChallengeSummary {
  const canStartOn = nextStartDate({
    today,
    lastEndedOn: challenge.ended_on,
  });

  return {
    challenge,
    canStartOn,
    canStartNow: today >= canStartOn,
  };
}

async function buildStudyWeekPanel(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
): Promise<StudyWeekPanel | null> {
  const plan = await getActiveStudyPlan(supabase, userId);
  if (!plan) {
    return null;
  }

  const weeks = await listStudyWeeks(supabase, plan.id);
  if (weeks.length === 0) {
    return null;
  }

  const current = weeks.find((week) => !week.is_completed);
  const totalWeeks = weeks.length;

  if (!current) {
    const lastWeek = weeks[weeks.length - 1];
    return {
      planId: plan.id,
      planTitle: plan.title,
      weekId: lastWeek.id,
      weekNumber: lastWeek.week_number,
      totalWeeks,
      title: lastWeek.title,
      focus: lastWeek.focus,
      buildTarget: lastWeek.build_target,
      items: [],
      completed: true,
    };
  }

  const items = await listStudyItems(supabase, current.id);

  return {
    planId: plan.id,
    planTitle: plan.title,
    weekId: current.id,
    weekNumber: current.week_number,
    totalWeeks,
    title: current.title,
    focus: current.focus,
    buildTarget: current.build_target,
    items,
    completed: false,
  };
}

function inactiveTodayState(
  settings: Awaited<ReturnType<typeof ensureSettings>>,
  habits: MonkHabit[],
  challenge: MonkChallenge | null,
  today: string,
): TodayPageData {
  if (!challenge) {
    return { mode: "setup", settings, habits };
  }

  const lastChallenge = closedSummary(challenge, today);
  if (challenge.status === "completed") {
    return { mode: "completed", settings, habits, lastChallenge };
  }

  return { mode: "reset_required", settings, habits, lastChallenge };
}

export async function getTodayPageData(): Promise<TodayPageData> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const settings = await ensureSettings(supabase, userId);
  const today = getTodayInTimezone(settings.timezone);
  const active = await prepareActiveChallenge(supabase, userId, settings);
  const [habits, attempts] = await Promise.all([
    listHabits(supabase, userId),
    listChallenges(supabase, userId),
  ]);

  if (!active || active.status !== "active") {
    return inactiveTodayState(
      settings,
      habits,
      active ?? attempts[0] ?? null,
      today,
    );
  }

  const day = await ensureTodayDay(supabase, {
    userId,
    challenge: active,
    today,
  });

  if (!day) {
    return inactiveTodayState(settings, habits, active, today);
  }

  const [logs, tasks, days] = await Promise.all([
    listHabitLogs(supabase, day.id),
    listTasks(supabase, day.id),
    listDaysForChallenge(supabase, active.id),
  ]);

  const score = scoreDay({
    habits: logs,
    tasks,
    socialMediaLimitMinutes: day.social_media_limit_minutes,
    socialMediaActualMinutes: day.social_media_actual_minutes,
    gamingLimitMinutes: day.gaming_limit_minutes,
    gamingActualMinutes: day.gaming_actual_minutes,
    maxMandatoryFailuresAllowed: active.max_mandatory_failures_allowed,
  });

  return {
    mode: "today",
    settings,
    challenge: active,
    day,
    isLocked: isDayLocked(day),
    habits: toHabitLogViews(logs, habits),
    tasks,
    score,
    streaks: computeChallengeStreaks({
      challenge: active,
      days,
      todayDayNumber: day.day_number,
      previousBest: previousBestStreak(attempts),
    }),
    studyWeek: await buildStudyWeekPanel(supabase, userId),
  };
}
