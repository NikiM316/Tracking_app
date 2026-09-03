import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  MonkChallenge,
  MonkDay,
  MonkFinalizationSource,
  MonkHabit,
  MonkHabitLog,
  MonkSettings,
  MonkTask,
  StudyPlan,
  StudyPlanItem,
  StudyPlanWeek,
} from "@/lib/supabase/monk-types";
import { PLACEHOLDER_USER_ID } from "@/lib/utils/placeholder-user";
import {
  DEFAULT_GAMING_LIMIT_MINUTES,
  isDayLocked,
  scoreDay,
  shouldResetOnFail,
} from "@/features/monk/lib/accountability";
import {
  addDays,
  dateForDayNumber,
  dayNumberForDate,
  eachDateInclusive,
  getTodayInTimezone,
  minIsoDate,
} from "@/features/monk/lib/dates";

export type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

export function getPlaceholderUserId(): string {
  return process.env.PLACEHOLDER_USER_ID ?? PLACEHOLDER_USER_ID;
}

export function revalidateMonkPaths() {
  return ["/monk", "/monk/challenge", "/monk/habits"] as const;
}

export async function ensureSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<MonkSettings> {
  const { data, error } = await supabase
    .from("monk_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load monk settings: ${error.message}`);
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("monk_settings")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to create monk settings: ${insertError?.message ?? "unknown error"}`,
    );
  }

  return inserted;
}

export async function listChallenges(
  supabase: SupabaseClient,
  userId: string,
): Promise<MonkChallenge[]> {
  const { data, error } = await supabase
    .from("monk_challenges")
    .select("*")
    .eq("user_id", userId)
    .order("attempt_number", { ascending: false });

  if (error) {
    throw new Error(`Failed to load challenges: ${error.message}`);
  }

  return data ?? [];
}

export async function getActiveChallenge(
  supabase: SupabaseClient,
  userId: string,
): Promise<MonkChallenge | null> {
  const { data, error } = await supabase
    .from("monk_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active challenge: ${error.message}`);
  }

  return data;
}

export async function listHabits(
  supabase: SupabaseClient,
  userId: string,
  activeOnly = false,
): Promise<MonkHabit[]> {
  let query = supabase
    .from("monk_habits")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load habits: ${error.message}`);
  }

  return data ?? [];
}

export async function getDayByDate(
  supabase: SupabaseClient,
  challengeId: string,
  date: string,
): Promise<MonkDay | null> {
  const { data, error } = await supabase
    .from("monk_days")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load day: ${error.message}`);
  }

  return data;
}

export async function listDaysForChallenge(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<MonkDay[]> {
  const { data, error } = await supabase
    .from("monk_days")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("day_number", { ascending: true });

  if (error) {
    throw new Error(`Failed to load challenge days: ${error.message}`);
  }

  return data ?? [];
}

async function listDaysInDateRange(
  supabase: SupabaseClient,
  challengeId: string,
  startDate: string,
  endDate: string,
): Promise<MonkDay[]> {
  const { data, error } = await supabase
    .from("monk_days")
    .select("*")
    .eq("challenge_id", challengeId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("day_number", { ascending: true });

  if (error) {
    throw new Error(`Failed to load challenge days: ${error.message}`);
  }

  return data ?? [];
}

export async function listHabitLogs(
  supabase: SupabaseClient,
  dayId: string,
): Promise<MonkHabitLog[]> {
  const { data, error } = await supabase
    .from("monk_habit_logs")
    .select("*")
    .eq("day_id", dayId);

  if (error) {
    throw new Error(`Failed to load habit logs: ${error.message}`);
  }

  return data ?? [];
}

async function listHabitLogsForDays(
  supabase: SupabaseClient,
  dayIds: string[],
): Promise<MonkHabitLog[]> {
  if (dayIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("monk_habit_logs")
    .select("*")
    .in("day_id", dayIds);

  if (error) {
    throw new Error(`Failed to load habit logs: ${error.message}`);
  }

  return data ?? [];
}

export async function listTasks(
  supabase: SupabaseClient,
  dayId: string,
): Promise<MonkTask[]> {
  const { data, error } = await supabase
    .from("monk_tasks")
    .select("*")
    .eq("day_id", dayId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load tasks: ${error.message}`);
  }

  return data ?? [];
}

async function listTasksForDays(
  supabase: SupabaseClient,
  dayIds: string[],
): Promise<MonkTask[]> {
  if (dayIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("monk_tasks")
    .select("*")
    .in("day_id", dayIds);

  if (error) {
    throw new Error(`Failed to load tasks: ${error.message}`);
  }

  return data ?? [];
}

function groupByDayId<T extends { day_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.day_id);
    if (list) {
      list.push(row);
    } else {
      grouped.set(row.day_id, [row]);
    }
  }
  return grouped;
}

async function countPassedDays(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("monk_days")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId)
    .eq("status", "passed");

  if (error) {
    throw new Error(`Failed to count passed days: ${error.message}`);
  }

  return count ?? 0;
}

async function reloadChallenge(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<MonkChallenge> {
  const { data, error } = await supabase
    .from("monk_challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to reload challenge: ${error?.message ?? "missing"}`);
  }

  return data;
}

export async function closeChallenge(
  supabase: SupabaseClient,
  challenge: MonkChallenge,
  params: {
    status: "failed" | "completed";
    endedOn: string;
    endedDayNumber: number;
  },
): Promise<MonkChallenge> {
  const successfulDaysCount = await countPassedDays(supabase, challenge.id);

  const { data, error } = await supabase
    .from("monk_challenges")
    .update({
      status: params.status,
      ended_on: params.endedOn,
      ended_day_number: params.endedDayNumber,
      successful_days_count: successfulDaysCount,
    })
    .eq("id", challenge.id)
    .eq("status", "active")
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to close challenge: ${error?.message ?? "challenge was not active"}`,
    );
  }

  return data;
}

function habitLogInsertRow(dayId: string, habit: MonkHabit) {
  return {
    day_id: dayId,
    habit_id: habit.id,
    is_mandatory_snapshot: habit.is_mandatory,
    target_value_snapshot: habit.target_value,
    target_unit_snapshot: habit.target_unit,
  };
}

async function insertHabitLogs(
  supabase: SupabaseClient,
  rows: ReturnType<typeof habitLogInsertRow>[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("monk_habit_logs").insert(rows);

  if (error && !isUniqueViolation(error)) {
    throw new Error(`Failed to snapshot habits: ${error.message}`);
  }
}

async function insertHabitLogsForDay(
  supabase: SupabaseClient,
  dayId: string,
  habits: MonkHabit[],
  existingHabitIds: Set<string>,
): Promise<void> {
  await insertHabitLogs(
    supabase,
    habits
      .filter((habit) => !existingHabitIds.has(habit.id))
      .map((habit) => habitLogInsertRow(dayId, habit)),
  );
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export async function getOrCreateDayWithHabits(
  supabase: SupabaseClient,
  params: {
    challenge: MonkChallenge;
    userId: string;
    date: string;
    dayNumber: number;
  },
): Promise<MonkDay> {
  const existing = await getDayByDate(supabase, params.challenge.id, params.date);
  if (existing) {
    await syncNewHabitsToUnlockedDay(supabase, params.userId, existing);
    return existing;
  }

  const { data: day, error } = await supabase
    .from("monk_days")
    .insert({
      challenge_id: params.challenge.id,
      user_id: params.userId,
      date: params.date,
      day_number: params.dayNumber,
      social_media_limit_minutes: params.challenge.social_media_limit_minutes,
      gaming_limit_minutes: DEFAULT_GAMING_LIMIT_MINUTES,
    })
    .select("*")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      const raced = await getDayByDate(supabase, params.challenge.id, params.date);
      if (raced) {
        await syncNewHabitsToUnlockedDay(supabase, params.userId, raced);
        return raced;
      }
    }

    throw new Error(`Failed to create day: ${error.message}`);
  }

  if (!day) {
    throw new Error("Failed to create day: unknown error");
  }

  const habits = await listHabits(supabase, params.userId, true);
  await insertHabitLogsForDay(supabase, day.id, habits, new Set());
  return day;
}

export async function syncNewHabitsToUnlockedDay(
  supabase: SupabaseClient,
  userId: string,
  day: MonkDay,
): Promise<void> {
  if (isDayLocked(day)) {
    return;
  }

  const [habits, logs] = await Promise.all([
    listHabits(supabase, userId, true),
    listHabitLogs(supabase, day.id),
  ]);

  await insertHabitLogsForDay(
    supabase,
    day.id,
    habits,
    new Set(logs.map((log) => log.habit_id)),
  );
}

export type DayReflection = {
  accomplished: string | null;
  failed_to_do: string | null;
  why_failed: string | null;
  improve_tomorrow: string | null;
};

export async function finalizeDayAndMaybeReset(
  supabase: SupabaseClient,
  params: {
    day: MonkDay;
    challenge: MonkChallenge;
    source: MonkFinalizationSource;
    reflection?: DayReflection;
  },
): Promise<{ day: MonkDay; challenge: MonkChallenge; passed: boolean }> {
  if (isDayLocked(params.day)) {
    return {
      day: params.day,
      challenge: params.challenge,
      passed: params.day.status === "passed",
    };
  }

  const [habits, tasks] = await Promise.all([
    listHabitLogs(supabase, params.day.id),
    listTasks(supabase, params.day.id),
  ]);

  const result = scoreDay({
    habits,
    tasks,
    socialMediaLimitMinutes: params.day.social_media_limit_minutes,
    socialMediaActualMinutes: params.day.social_media_actual_minutes,
    gamingLimitMinutes: params.day.gaming_limit_minutes,
    gamingActualMinutes: params.day.gaming_actual_minutes,
    maxMandatoryFailuresAllowed: params.challenge.max_mandatory_failures_allowed,
  });

  const now = new Date().toISOString();
  const nextStatus = result.passed ? "passed" : "failed";

  const { data: updatedDay, error } = await supabase
    .from("monk_days")
    .update({
      status: nextStatus,
      finalized_at: now,
      finalization_source: params.source,
      ...(params.reflection ?? {}),
    })
    .eq("id", params.day.id)
    .eq("status", "in_progress")
    .select("*")
    .single();

  if (error || !updatedDay) {
    throw new Error(
      `Failed to finalize day: ${error?.message ?? "day was already locked"}`,
    );
  }

  let challenge = params.challenge;

  if (!result.passed && shouldResetOnFail(challenge)) {
    challenge = await closeChallenge(supabase, challenge, {
      status: "failed",
      endedOn: updatedDay.date,
      endedDayNumber: updatedDay.day_number,
    });
  } else if (result.passed && updatedDay.day_number >= challenge.target_days) {
    challenge = await closeChallenge(supabase, challenge, {
      status: "completed",
      endedOn: updatedDay.date,
      endedDayNumber: updatedDay.day_number,
    });
  } else {
    challenge = await reloadChallenge(supabase, challenge.id);
  }

  return { day: updatedDay, challenge, passed: result.passed };
}

type MissedDayInsert = {
  challenge_id: string;
  user_id: string;
  date: string;
  day_number: number;
  status: "failed";
  finalized_at: string;
  finalization_source: "system_missed";
  social_media_limit_minutes: number;
  gaming_limit_minutes: number;
};

type OpenDayFinalization = {
  day: MonkDay;
  passed: boolean;
};

type CatchUpClose = {
  status: "failed" | "completed";
  endedOn: string;
  endedDayNumber: number;
};

export async function catchUpMissedDays(
  supabase: SupabaseClient,
  userId: string,
  challenge: MonkChallenge,
  today: string,
): Promise<MonkChallenge> {
  if (challenge.status !== "active") {
    return challenge;
  }

  const lastDate = dateForDayNumber(challenge.started_on, challenge.target_days);
  const yesterday = addDays(today, -1);
  const catchUpUntil = minIsoDate(yesterday, lastDate);

  if (catchUpUntil < challenge.started_on) {
    return challenge;
  }

  const dates = eachDateInclusive(challenge.started_on, catchUpUntil);
  const existingDays = await listDaysInDateRange(
    supabase,
    challenge.id,
    challenge.started_on,
    catchUpUntil,
  );
  const existingByDate = new Map(existingDays.map((day) => [day.date, day]));
  const openDays = dates
    .map((date) => existingByDate.get(date))
    .filter((day): day is MonkDay => day != null && day.status === "in_progress");
  const hasMissingDates = dates.some((date) => !existingByDate.has(date));

  if (!hasMissingDates && openDays.length === 0) {
    return challenge;
  }

  const now = new Date().toISOString();
  const pendingOpenHabitLogs: ReturnType<typeof habitLogInsertRow>[] = [];
  const logsByDay = new Map<string, MonkHabitLog[]>();
  const tasksByDay = new Map<string, MonkTask[]>();
  let activeHabits: MonkHabit[] = [];
  let habitsLoaded = false;

  if (openDays.length > 0) {
    const openIds = openDays.map((day) => day.id);
    const [habits, logs, tasks] = await Promise.all([
      listHabits(supabase, userId, true),
      listHabitLogsForDays(supabase, openIds),
      listTasksForDays(supabase, openIds),
    ]);
    activeHabits = habits;
    habitsLoaded = true;

    for (const [dayId, dayLogs] of groupByDayId(logs)) {
      logsByDay.set(dayId, dayLogs);
    }
    for (const [dayId, dayTasks] of groupByDayId(tasks)) {
      tasksByDay.set(dayId, dayTasks);
    }

    for (const day of openDays) {
      const dayLogs = logsByDay.get(day.id) ?? [];
      logsByDay.set(day.id, dayLogs);
      const existingHabitIds = new Set(dayLogs.map((log) => log.habit_id));
      for (const habit of habits) {
        if (existingHabitIds.has(habit.id)) {
          continue;
        }
        const row = habitLogInsertRow(day.id, habit);
        pendingOpenHabitLogs.push(row);
        dayLogs.push({
          ...row,
          id: "",
          is_completed: false,
          completed_at: null,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  const missingDays: MissedDayInsert[] = [];
  const openFinalizations: OpenDayFinalization[] = [];
  let close: CatchUpClose | null = null;

  for (const date of dates) {
    if (close) {
      break;
    }

    const dayNumber = dayNumberForDate(challenge.started_on, date);
    const existing = existingByDate.get(date);

    if (existing) {
      if (existing.status !== "in_progress") {
        continue;
      }

      const result = scoreDay({
        habits: logsByDay.get(existing.id) ?? [],
        tasks: tasksByDay.get(existing.id) ?? [],
        socialMediaLimitMinutes: existing.social_media_limit_minutes,
        socialMediaActualMinutes: existing.social_media_actual_minutes,
        gamingLimitMinutes: existing.gaming_limit_minutes,
        gamingActualMinutes: existing.gaming_actual_minutes,
        maxMandatoryFailuresAllowed: challenge.max_mandatory_failures_allowed,
      });
      openFinalizations.push({ day: existing, passed: result.passed });

      if (!result.passed && shouldResetOnFail(challenge)) {
        close = {
          status: "failed",
          endedOn: date,
          endedDayNumber: dayNumber,
        };
      } else if (result.passed && dayNumber >= challenge.target_days) {
        close = {
          status: "completed",
          endedOn: date,
          endedDayNumber: dayNumber,
        };
      }
      continue;
    }

    missingDays.push({
      challenge_id: challenge.id,
      user_id: userId,
      date,
      day_number: dayNumber,
      status: "failed",
      finalized_at: now,
      finalization_source: "system_missed",
      social_media_limit_minutes: challenge.social_media_limit_minutes,
      gaming_limit_minutes: DEFAULT_GAMING_LIMIT_MINUTES,
    });

    if (shouldResetOnFail(challenge)) {
      close = {
        status: "failed",
        endedOn: date,
        endedDayNumber: dayNumber,
      };
    }
  }

  const finalizedOpenIds = new Set(
    openFinalizations.map((item) => item.day.id),
  );
  const habitLogsToInsert = pendingOpenHabitLogs.filter((row) =>
    finalizedOpenIds.has(row.day_id),
  );

  if (missingDays.length > 0) {
    const [habits, insertResult] = await Promise.all([
      habitsLoaded
        ? Promise.resolve(activeHabits)
        : listHabits(supabase, userId, true),
      supabase.from("monk_days").insert(missingDays).select("*"),
    ]);
    activeHabits = habits;

    const { data: insertedDays, error: insertError } = insertResult;
    if (insertError) {
      if (!isUniqueViolation(insertError)) {
        throw new Error(`Failed to catch up missed days: ${insertError.message}`);
      }
    } else {
      for (const day of insertedDays ?? []) {
        for (const habit of activeHabits) {
          habitLogsToInsert.push(habitLogInsertRow(day.id, habit));
        }
      }
    }
  }

  const writes: Promise<unknown>[] = [insertHabitLogs(supabase, habitLogsToInsert)];

  for (const { day, passed } of openFinalizations) {
    writes.push(
      (async () => {
        const { error } = await supabase
          .from("monk_days")
          .update({
            status: passed ? "passed" : "failed",
            finalized_at: now,
            finalization_source: "automatic",
          })
          .eq("id", day.id)
          .eq("status", "in_progress");

        if (error) {
          throw new Error(`Failed to finalize day: ${error.message}`);
        }
      })(),
    );
  }

  await Promise.all(writes);

  if (close) {
    return closeChallenge(supabase, challenge, close);
  }

  return challenge;
}

export async function ensureTodayDay(
  supabase: SupabaseClient,
  params: {
    userId: string;
    challenge: MonkChallenge;
    today: string;
  },
): Promise<MonkDay | null> {
  const dayNumber = dayNumberForDate(params.challenge.started_on, params.today);

  if (dayNumber < 1 || dayNumber > params.challenge.target_days) {
    return null;
  }

  return getOrCreateDayWithHabits(supabase, {
    challenge: params.challenge,
    userId: params.userId,
    date: params.today,
    dayNumber,
  });
}

export async function prepareActiveChallenge(
  supabase: SupabaseClient,
  userId: string,
  settings: MonkSettings,
): Promise<MonkChallenge | null> {
  const today = getTodayInTimezone(settings.timezone);
  const active = await getActiveChallenge(supabase, userId);
  if (!active) {
    return null;
  }

  const updated = await catchUpMissedDays(supabase, userId, active, today);
  return updated.status === "active" ? updated : null;
}

export async function getActiveStudyPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudyPlan | null> {
  const { data, error } = await supabase
    .from("study_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load study plan: ${error.message}`);
  }

  return data;
}

export async function listStudyWeeks(
  supabase: SupabaseClient,
  planId: string,
): Promise<StudyPlanWeek[]> {
  const { data, error } = await supabase
    .from("study_plan_weeks")
    .select("*")
    .eq("plan_id", planId)
    .order("week_number", { ascending: true });

  if (error) {
    throw new Error(`Failed to load study modules: ${error.message}`);
  }

  return data ?? [];
}

export async function completeStudyWeek(
  supabase: SupabaseClient,
  userId: string,
  weekId: string,
): Promise<void> {
  const plan = await getActiveStudyPlan(supabase, userId);
  if (!plan) {
    throw new Error("No active study plan.");
  }

  const weeks = await listStudyWeeks(supabase, plan.id);
  const current = weeks.find((week) => !week.is_completed);
  if (!current) {
    throw new Error("All modules are already complete.");
  }
  if (current.id !== weekId) {
    throw new Error("This is not the current module.");
  }

  const { error } = await supabase
    .from("study_plan_weeks")
    .update({ is_completed: true })
    .eq("id", weekId)
    .eq("plan_id", plan.id)
    .eq("is_completed", false);

  if (error) {
    throw new Error(`Failed to complete module: ${error.message}`);
  }
}

export async function listStudyItems(
  supabase: SupabaseClient,
  weekId: string,
): Promise<StudyPlanItem[]> {
  const { data, error } = await supabase
    .from("study_plan_items")
    .select("*")
    .eq("week_id", weekId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load study items: ${error.message}`);
  }

  return data ?? [];
}

export async function toggleStudyItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  completed: boolean,
): Promise<void> {
  const plan = await getActiveStudyPlan(supabase, userId);
  if (!plan) {
    throw new Error("No active study plan.");
  }

  const { data: item, error: itemError } = await supabase
    .from("study_plan_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    throw new Error(itemError?.message ?? "Study item not found.");
  }

  const { data: week, error: weekError } = await supabase
    .from("study_plan_weeks")
    .select("id")
    .eq("id", item.week_id)
    .eq("plan_id", plan.id)
    .maybeSingle();

  if (weekError || !week) {
    throw new Error(weekError?.message ?? "Study item is not on the active plan.");
  }

  const { error } = await supabase
    .from("study_plan_items")
    .update({ is_completed: completed })
    .eq("id", itemId);

  if (error) {
    throw new Error(`Failed to update study item: ${error.message}`);
  }
}

export function lockedError(): { error: string } {
  return {
    error: "This day is locked. Finalized days cannot be changed.",
  };
}
