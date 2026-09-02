"use server";

import { revalidatePath } from "next/cache";

import {
  computeChallengeStreaks,
  isDayLocked,
  nextStartDate,
  previousBestStreak,
  scoreDay,
} from "@/features/monk/lib/accountability";
import {
  completeStudyWeek,
  ensureSettings,
  ensureTodayDay,
  finalizeDayAndMaybeReset,
  getActiveStudyPlan,
  getPlaceholderUserId,
  listChallenges,
  listDaysForChallenge,
  listHabitLogs,
  listHabits,
  listStudyItems,
  listStudyWeeks,
  listTasks,
  lockedError,
  prepareActiveChallenge,
  toggleStudyItem,
} from "@/features/monk/lib/challenge-ops";
import { getTodayInTimezone } from "@/features/monk/lib/dates";
import type {
  ActionResult,
  ClosedChallengeSummary,
  MonkHabitLogView,
  StudyWeekPanel,
  TodayPageData,
} from "@/features/monk/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MonkChallenge, MonkDay, MonkHabit } from "@/lib/supabase/monk-types";

type MonkPath = "/monk" | "/monk/challenge" | "/monk/habits";

function touchMonkPaths(...paths: MonkPath[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

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

async function loadUnlockedDay(dayId: string): Promise<
  | { supabase: ReturnType<typeof createServerSupabaseClient>; day: MonkDay }
  | { error: string }
> {
  const supabase = createServerSupabaseClient();
  const { data: day, error } = await supabase
    .from("monk_days")
    .select("*")
    .eq("id", dayId)
    .single();

  if (error || !day) {
    return { error: error?.message ?? "Day not found." };
  }

  if (isDayLocked(day)) {
    return lockedError();
  }

  return { supabase, day };
}

export async function toggleHabitLog(
  logId: string,
  completed: boolean,
): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { data: log, error: logError } = await supabase
    .from("monk_habit_logs")
    .select("*")
    .eq("id", logId)
    .single();

  if (logError || !log) {
    return { error: logError?.message ?? "Habit not found." };
  }

  const unlocked = await loadUnlockedDay(log.day_id);
  if ("error" in unlocked) {
    return unlocked;
  }

  const { error } = await unlocked.supabase
    .from("monk_habit_logs")
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", logId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function addTask(input: {
  dayId: string;
  title: string;
  isMandatory?: boolean;
  studyItemId?: string | null;
}): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) {
    return { error: "Task title is required." };
  }

  const unlocked = await loadUnlockedDay(input.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const tasks = await listTasks(unlocked.supabase, input.dayId);
  const nextOrder =
    tasks.reduce((max, task) => Math.max(max, task.sort_order), -1) + 1;

  const { error } = await unlocked.supabase.from("monk_tasks").insert({
    day_id: input.dayId,
    user_id: unlocked.day.user_id,
    title,
    is_mandatory: input.isMandatory ?? false,
    sort_order: nextOrder,
    study_item_id: input.studyItemId ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function updateTask(input: {
  taskId: string;
  title?: string;
  isMandatory?: boolean;
  isCompleted?: boolean;
}): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { data: task, error: taskError } = await supabase
    .from("monk_tasks")
    .select("*")
    .eq("id", input.taskId)
    .single();

  if (taskError || !task) {
    return { error: taskError?.message ?? "Task not found." };
  }

  const unlocked = await loadUnlockedDay(task.day_id);
  if ("error" in unlocked) {
    return unlocked;
  }

  const patch: {
    title?: string;
    is_mandatory?: boolean;
    is_completed?: boolean;
    completed_at?: string | null;
  } = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      return { error: "Task title is required." };
    }
    patch.title = title;
  }

  if (input.isMandatory !== undefined) {
    patch.is_mandatory = input.isMandatory;
  }

  if (input.isCompleted !== undefined) {
    patch.is_completed = input.isCompleted;
    patch.completed_at = input.isCompleted ? new Date().toISOString() : null;
  }

  const { error } = await unlocked.supabase
    .from("monk_tasks")
    .update(patch)
    .eq("id", input.taskId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { data: task, error: taskError } = await supabase
    .from("monk_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return { error: taskError?.message ?? "Task not found." };
  }

  const unlocked = await loadUnlockedDay(task.day_id);
  if ("error" in unlocked) {
    return unlocked;
  }

  const { error } = await unlocked.supabase
    .from("monk_tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function reorderTasks(
  dayId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const unlocked = await loadUnlockedDay(dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      unlocked.supabase.from("monk_tasks").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return { error: failed.error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function setSocialMediaMinutes(
  dayId: string,
  minutes: number | null,
): Promise<ActionResult> {
  if (minutes !== null && (minutes < 0 || !Number.isFinite(minutes))) {
    return { error: "Minutes must be zero or more." };
  }

  const unlocked = await loadUnlockedDay(dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const rounded = minutes === null ? null : Math.round(minutes);
  const { error } = await unlocked.supabase
    .from("monk_days")
    .update({ social_media_actual_minutes: rounded })
    .eq("id", dayId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function setSocialMediaLimit(
  dayId: string,
  minutes: number,
): Promise<ActionResult> {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return { error: "Limit must be zero or more." };
  }

  const unlocked = await loadUnlockedDay(dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const rounded = Math.round(minutes);
  const { error: dayError } = await unlocked.supabase
    .from("monk_days")
    .update({ social_media_limit_minutes: rounded })
    .eq("id", dayId);

  if (dayError) {
    return { error: dayError.message };
  }

  const { error: settingsError } = await unlocked.supabase
    .from("monk_settings")
    .update({ social_media_limit_minutes: rounded })
    .eq("user_id", unlocked.day.user_id);

  if (settingsError) {
    return { error: settingsError.message };
  }

  const { error: challengeError } = await unlocked.supabase
    .from("monk_challenges")
    .update({ social_media_limit_minutes: rounded })
    .eq("id", unlocked.day.challenge_id)
    .eq("status", "active");

  if (challengeError) {
    return { error: challengeError.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

function validateMinutes(minutes: number | null, label: string): ActionResult | null {
  if (minutes !== null && (minutes < 0 || !Number.isFinite(minutes))) {
    return { error: `${label} must be zero or more.` };
  }
  return null;
}

export async function setGamingMinutes(
  dayId: string,
  minutes: number | null,
): Promise<ActionResult> {
  const invalid = validateMinutes(minutes, "Minutes");
  if (invalid) {
    return invalid;
  }

  const unlocked = await loadUnlockedDay(dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const rounded = minutes === null ? null : Math.round(minutes);
  const { error } = await unlocked.supabase
    .from("monk_days")
    .update({ gaming_actual_minutes: rounded })
    .eq("id", dayId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function setGamingLimit(
  dayId: string,
  minutes: number,
): Promise<ActionResult> {
  const invalid = validateMinutes(minutes, "Limit");
  if (invalid) {
    return invalid;
  }

  const unlocked = await loadUnlockedDay(dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const { error } = await unlocked.supabase
    .from("monk_days")
    .update({ gaming_limit_minutes: Math.round(minutes) })
    .eq("id", dayId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function addStudyItemAsTask(input: {
  dayId: string;
  studyItemId: string;
  isMandatory: boolean;
  todayTarget: string;
}): Promise<ActionResult> {
  const todayTarget = input.todayTarget.trim();
  if (!todayTarget) {
    return { error: "Set today's target before adding." };
  }

  const unlocked = await loadUnlockedDay(input.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const { data: item, error: itemError } = await unlocked.supabase
    .from("study_plan_items")
    .select("*")
    .eq("id", input.studyItemId)
    .single();

  if (itemError || !item) {
    return { error: itemError?.message ?? "Study item not found." };
  }

  return addTask({
    dayId: input.dayId,
    title: `${item.title}: ${todayTarget}`,
    isMandatory: input.isMandatory,
    studyItemId: input.studyItemId,
  });
}

export async function toggleStudyPlanItem(
  itemId: string,
  completed: boolean,
): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  try {
    await toggleStudyItem(supabase, userId, itemId, completed);
  } catch (updateError) {
    return {
      error:
        updateError instanceof Error
          ? updateError.message
          : "Failed to update the study item.",
    };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function completeStudyModule(weekId: string): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  try {
    await completeStudyWeek(supabase, userId, weekId);
  } catch (completeError) {
    return {
      error:
        completeError instanceof Error
          ? completeError.message
          : "Failed to complete the module.",
    };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

function optionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export type DayReflectionInput = {
  accomplished?: string | null;
  failedToDo?: string | null;
  whyFailed?: string | null;
  improveTomorrow?: string | null;
};

export async function finalizeToday(
  dayId: string,
  reflection?: DayReflectionInput,
): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const { data: day, error } = await supabase
    .from("monk_days")
    .select("*")
    .eq("id", dayId)
    .single();

  if (error || !day) {
    return { error: error?.message ?? "Day not found." };
  }

  if (isDayLocked(day)) {
    return lockedError();
  }

  const { data: challenge, error: challengeError } = await supabase
    .from("monk_challenges")
    .select("*")
    .eq("id", day.challenge_id)
    .single();

  if (challengeError || !challenge) {
    return { error: challengeError?.message ?? "Challenge not found." };
  }

  try {
    await finalizeDayAndMaybeReset(supabase, {
      day,
      challenge,
      source: "manual",
      reflection: {
        accomplished: optionalText(reflection?.accomplished),
        failed_to_do: optionalText(reflection?.failedToDo),
        why_failed: optionalText(reflection?.whyFailed),
        improve_tomorrow: optionalText(reflection?.improveTomorrow),
      },
    });
  } catch (finalizeError) {
    return {
      error:
        finalizeError instanceof Error
          ? finalizeError.message
          : "Failed to finalize the day.",
    };
  }

  touchMonkPaths("/monk", "/monk/challenge");
  return { ok: true };
}
