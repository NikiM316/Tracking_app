"use server";

import { getProgramDay } from "@/lib/program/cycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCycleAnchorDate, getCycleDay } from "@/lib/utils/cycle-day";
import { PLACEHOLDER_USER_ID } from "@/lib/utils/placeholder-user";

const REST_CYCLE_DAYS = new Set([4, 7, 11, 14]);
const CALENDAR_DAYS = 90;

function getPlaceholderUserId(): string {
  return process.env.PLACEHOLDER_USER_ID ?? PLACEHOLDER_USER_ID;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type ConsistencyDayStatus = "logged" | "rest" | "missed" | "future";

export type ConsistencyDay = {
  date: string;
  cycleDay: number;
  programLabel: string | null;
  status: ConsistencyDayStatus;
};

export async function getConsistencyCalendar(): Promise<ConsistencyDay[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const anchorDate = getCycleAnchorDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (CALENDAR_DAYS - 1));

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("date")
    .eq("user_id", userId)
    .gte("date", toDateString(startDate))
    .lte("date", toDateString(today));

  if (error) {
    throw new Error(`Failed to fetch workouts for calendar: ${error.message}`);
  }

  const loggedDates = new Set((workouts ?? []).map((workout) => workout.date));

  const days: ConsistencyDay[] = [];

  for (let i = 0; i < CALENDAR_DAYS; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const dateStr = toDateString(date);
    const cycleDay = getCycleDay(anchorDate, date);
    const programDay = getProgramDay(cycleDay);
    const isRestDay = REST_CYCLE_DAYS.has(cycleDay);
    const isFuture = date.getTime() > today.getTime();

    let status: ConsistencyDayStatus;
    if (isFuture) {
      status = "future";
    } else if (loggedDates.has(dateStr)) {
      status = "logged";
    } else if (isRestDay) {
      status = "rest";
    } else {
      status = "missed";
    }

    days.push({
      date: dateStr,
      cycleDay,
      programLabel: programDay?.label ?? null,
      status,
    });
  }

  return days;
}

export type ExerciseOption = {
  id: string;
  name: string;
  slug: string;
};

export async function getExercisesForAnalytics(): Promise<ExerciseOption[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  return data ?? [];
}

export type ExerciseProgressPoint = {
  date: string;
  estimatedOneRepMax: number;
  maxWeight: number;
  bestReps: number;
};

export async function getExerciseProgress(
  exerciseId: string,
): Promise<ExerciseProgressPoint[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("id, date")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (workoutsError) {
    throw new Error(`Failed to fetch workouts: ${workoutsError.message}`);
  }

  if (!workouts || workouts.length === 0) {
    return [];
  }

  const workoutIds = workouts.map((workout) => workout.id);
  const dateByWorkoutId = new Map(
    workouts.map((workout) => [workout.id, workout.date]),
  );

  const { data: sets, error: setsError } = await supabase
    .from("sets")
    .select("workout_id, weight_kg, reps")
    .eq("exercise_id", exerciseId)
    .in("workout_id", workoutIds)
    .not("weight_kg", "is", null);

  if (setsError) {
    throw new Error(`Failed to fetch sets: ${setsError.message}`);
  }

  const bestByDate = new Map<string, ExerciseProgressPoint>();

  for (const set of sets ?? []) {
    const date = dateByWorkoutId.get(set.workout_id);
    if (!date || set.weight_kg === null) continue;

    // Epley formula for estimated one-rep max.
    const estimatedOneRepMax = set.weight_kg * (1 + set.reps / 30);
    const existing = bestByDate.get(date);

    if (!existing || estimatedOneRepMax > existing.estimatedOneRepMax) {
      bestByDate.set(date, {
        date,
        estimatedOneRepMax: Math.round(estimatedOneRepMax * 10) / 10,
        maxWeight: set.weight_kg,
        bestReps: set.reps,
      });
    }
  }

  return [...bestByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
