import "server-only";

import {
  buildConsistencyDays,
  type CalendarWorkout,
  type ConsistencyDay,
} from "@/features/fitness/lib/consistency";
import type { ExerciseOption, ExerciseProgressPoint } from "@/features/fitness/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/utils/dates";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";

export async function getConsistencyCalendar(): Promise<ConsistencyDay[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const todayStr = getTodayInTimezone();

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("date, cycle_day, completed_at")
    .eq("user_id", userId)
    .lte("date", todayStr)
    .order("date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch workouts for calendar: ${error.message}`);
  }

  const calendarWorkouts: CalendarWorkout[] = (workouts ?? []).flatMap((workout) =>
    workout.cycle_day == null
      ? []
      : [
          {
            date: workout.date,
            cycle_day: workout.cycle_day,
            completed_at: workout.completed_at,
          },
        ],
  );

  return buildConsistencyDays(todayStr, calendarWorkouts);
}

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
    .select("workout_id, weight_kg, reps, rest_seconds")
    .eq("exercise_id", exerciseId)
    .in("workout_id", workoutIds)
    .not("weight_kg", "is", null);

  if (setsError) {
    throw new Error(`Failed to fetch sets: ${setsError.message}`);
  }

  const bestByDate = new Map<string, ExerciseProgressPoint>();

  for (const set of sets ?? []) {
    if (set.workout_id == null || set.weight_kg === null || set.reps == null) {
      continue;
    }
    const date = dateByWorkoutId.get(set.workout_id);
    if (!date) continue;

    const estimatedOneRepMax = set.weight_kg * (1 + set.reps / 30);
    const existing = bestByDate.get(date);

    if (!existing || estimatedOneRepMax > existing.estimatedOneRepMax) {
      bestByDate.set(date, {
        date,
        estimatedOneRepMax: Math.round(estimatedOneRepMax * 10) / 10,
        maxWeight: set.weight_kg,
        bestReps: set.reps,
        bestSetRestSeconds: set.rest_seconds,
      });
    }
  }

  return [...bestByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
