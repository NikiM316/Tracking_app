"use server";

import { revalidatePath } from "next/cache";

import { isDayLocked } from "@/features/monk/lib/accountability";
import {
  completeStudyWeek,
  finalizeDayAndMaybeReset,
  listTasks,
  lockedError,
  toggleStudyItem,
} from "@/features/monk/lib/challenge-ops";
import type { ActionResult, DayReflectionInput } from "@/features/monk/types";
import {
  addStudyItemAsTaskSchema,
  addTaskSchema,
  completeStudyModuleSchema,
  deleteTaskSchema,
  finalizeTodaySchema,
  reorderTasksSchema,
  setLimitSchema,
  setMinutesSchema,
  toggleHabitLogSchema,
  toggleStudyPlanItemSchema,
  updateTaskSchema,
} from "@/features/monk/schemas";
import type { MonkDay } from "@/lib/supabase/monk-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { parseActionInput } from "@/lib/validation";

type MonkPath = "/monk" | "/monk/challenge" | "/monk/habits";

function touchMonkPaths(...paths: MonkPath[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
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
  const parsed = parseActionInput(toggleHabitLogSchema, { logId, completed });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const { data: log, error: logError } = await supabase
    .from("monk_habit_logs")
    .select("*")
    .eq("id", parsed.data.logId)
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
      is_completed: parsed.data.completed,
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.logId);

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
  const parsed = parseActionInput(addTaskSchema, input);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const unlocked = await loadUnlockedDay(parsed.data.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const tasks = await listTasks(unlocked.supabase, parsed.data.dayId);
  const nextOrder =
    tasks.reduce((max, task) => Math.max(max, task.sort_order), -1) + 1;

  const { error } = await unlocked.supabase.from("monk_tasks").insert({
    day_id: parsed.data.dayId,
    user_id: unlocked.day.user_id,
    title: parsed.data.title,
    is_mandatory: parsed.data.isMandatory ?? false,
    sort_order: nextOrder,
    study_item_id: parsed.data.studyItemId ?? null,
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
  const parsed = parseActionInput(updateTaskSchema, input);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const { data: task, error: taskError } = await supabase
    .from("monk_tasks")
    .select("*")
    .eq("id", parsed.data.taskId)
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

  if (parsed.data.title !== undefined) {
    patch.title = parsed.data.title;
  }

  if (parsed.data.isMandatory !== undefined) {
    patch.is_mandatory = parsed.data.isMandatory;
  }

  if (parsed.data.isCompleted !== undefined) {
    patch.is_completed = parsed.data.isCompleted;
    patch.completed_at = parsed.data.isCompleted ? new Date().toISOString() : null;
  }

  const { error } = await unlocked.supabase
    .from("monk_tasks")
    .update(patch)
    .eq("id", parsed.data.taskId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths("/monk");
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const parsed = parseActionInput(deleteTaskSchema, { taskId });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const { data: task, error: taskError } = await supabase
    .from("monk_tasks")
    .select("*")
    .eq("id", parsed.data.taskId)
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
    .eq("id", parsed.data.taskId);

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
  const parsed = parseActionInput(reorderTasksSchema, { dayId, orderedIds });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const unlocked = await loadUnlockedDay(parsed.data.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const results = await Promise.all(
    parsed.data.orderedIds.map((id, index) =>
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
  const parsed = parseActionInput(setMinutesSchema, { dayId, minutes });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const unlocked = await loadUnlockedDay(parsed.data.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const rounded = parsed.data.minutes === null ? null : Math.round(parsed.data.minutes);
  const { error } = await unlocked.supabase
    .from("monk_days")
    .update({ social_media_actual_minutes: rounded })
    .eq("id", parsed.data.dayId);

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
  const parsed = parseActionInput(setLimitSchema, { dayId, minutes });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const unlocked = await loadUnlockedDay(parsed.data.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const rounded = Math.round(parsed.data.minutes);
  const { error: dayError } = await unlocked.supabase
    .from("monk_days")
    .update({ social_media_limit_minutes: rounded })
    .eq("id", parsed.data.dayId);

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

export async function setGamingMinutes(
  dayId: string,
  minutes: number | null,
): Promise<ActionResult> {
  const parsed = parseActionInput(setMinutesSchema, { dayId, minutes });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const unlocked = await loadUnlockedDay(parsed.data.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const rounded = parsed.data.minutes === null ? null : Math.round(parsed.data.minutes);
  const { error } = await unlocked.supabase
    .from("monk_days")
    .update({ gaming_actual_minutes: rounded })
    .eq("id", parsed.data.dayId);

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
  const parsed = parseActionInput(setLimitSchema, { dayId, minutes });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const unlocked = await loadUnlockedDay(parsed.data.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const { error } = await unlocked.supabase
    .from("monk_days")
    .update({ gaming_limit_minutes: Math.round(parsed.data.minutes) })
    .eq("id", parsed.data.dayId);

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
  const parsed = parseActionInput(addStudyItemAsTaskSchema, input);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const unlocked = await loadUnlockedDay(parsed.data.dayId);
  if ("error" in unlocked) {
    return unlocked;
  }

  const { data: item, error: itemError } = await unlocked.supabase
    .from("study_plan_items")
    .select("*")
    .eq("id", parsed.data.studyItemId)
    .single();

  if (itemError || !item) {
    return { error: itemError?.message ?? "Study item not found." };
  }

  return addTask({
    dayId: parsed.data.dayId,
    title: `${item.title}: ${parsed.data.todayTarget}`,
    isMandatory: parsed.data.isMandatory,
    studyItemId: parsed.data.studyItemId,
  });
}

export async function toggleStudyPlanItem(
  itemId: string,
  completed: boolean,
): Promise<ActionResult> {
  const parsed = parseActionInput(toggleStudyPlanItemSchema, { itemId, completed });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  try {
    await toggleStudyItem(supabase, userId, parsed.data.itemId, parsed.data.completed);
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
  const parsed = parseActionInput(completeStudyModuleSchema, { weekId });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  try {
    await completeStudyWeek(supabase, userId, parsed.data.weekId);
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

export async function finalizeToday(
  dayId: string,
  reflection?: DayReflectionInput,
): Promise<ActionResult> {
  const parsed = parseActionInput(finalizeTodaySchema, { dayId, reflection });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const { data: day, error } = await supabase
    .from("monk_days")
    .select("*")
    .eq("id", parsed.data.dayId)
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
        accomplished: optionalText(parsed.data.reflection?.accomplished),
        failed_to_do: optionalText(parsed.data.reflection?.failedToDo),
        why_failed: optionalText(parsed.data.reflection?.whyFailed),
        improve_tomorrow: optionalText(parsed.data.reflection?.improveTomorrow),
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
