"use server";

import { revalidatePath } from "next/cache";

import {
  getOrCreateTodayWorkout,
  getPlaceholderUserId,
} from "@/features/fitness/lib/today-workout";
import { getProgramDay } from "@/lib/program/cycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Exercise, Set, SetCategory, Workout } from "@/lib/supabase/types";
import { WATER_INCREMENT_ML } from "@/lib/utils/water";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

function orderExercisesByProgram(
  exercises: Exercise[],
  slugs: readonly string[],
): Exercise[] {
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));

  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((exercise): exercise is Exercise => exercise !== undefined);
}

async function getPreviousNotesByExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseIds: string[],
  excludeWorkoutId?: string,
): Promise<Record<string, string>> {
  if (exerciseIds.length === 0) {
    return {};
  }

  const { data: completedWorkouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("id, date")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date", { ascending: false });

  if (workoutsError) {
    throw new Error(`Failed to fetch workout history: ${workoutsError.message}`);
  }

  const relevantWorkouts = (completedWorkouts ?? []).filter(
    (candidate) => candidate.id !== excludeWorkoutId,
  );

  if (relevantWorkouts.length === 0) {
    return {};
  }

  const dateByWorkoutId = new Map(
    relevantWorkouts.map((candidate) => [candidate.id, candidate.date]),
  );
  const workoutIds = relevantWorkouts.map((candidate) => candidate.id);

  const { data: notes, error: notesError } = await supabase
    .from("exercise_notes")
    .select("*")
    .in("exercise_id", exerciseIds)
    .in("workout_id", workoutIds);

  if (notesError) {
    throw new Error(`Failed to fetch previous notes: ${notesError.message}`);
  }

  const sorted = (notes ?? [])
    .filter((note) => note.note.trim().length > 0)
    .sort((a, b) => {
      const dateA = dateByWorkoutId.get(a.workout_id) ?? "";
      const dateB = dateByWorkoutId.get(b.workout_id) ?? "";
      return dateB.localeCompare(dateA);
    });

  const result: Record<string, string> = {};
  for (const note of sorted) {
    if (!(note.exercise_id in result)) {
      result[note.exercise_id] = note.note;
    }
  }

  return result;
}

export type PreviousSessionSet = {
  weight: number | null;
  reps: number;
  set_order: number;
};

export type PreviousExerciseSession = {
  workoutDate: string;
  sets: PreviousSessionSet[];
};

async function getPreviousSessionsByExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseIds: string[],
  excludeWorkoutId?: string,
): Promise<Record<string, PreviousExerciseSession | null>> {
  const result: Record<string, PreviousExerciseSession | null> = {};
  for (const exerciseId of exerciseIds) {
    result[exerciseId] = null;
  }

  if (exerciseIds.length === 0) {
    return result;
  }

  const { data: completedWorkouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("id, date")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date", { ascending: false });

  if (workoutsError) {
    throw new Error(
      `Failed to fetch previous exercise session: ${workoutsError.message}`,
    );
  }

  const relevantWorkouts = (completedWorkouts ?? []).filter(
    (workout) => workout.id !== excludeWorkoutId,
  );

  if (relevantWorkouts.length === 0) {
    return result;
  }

  const workoutIds = relevantWorkouts.map((workout) => workout.id);

  const { data: sets, error: setsError } = await supabase
    .from("sets")
    .select("workout_id, exercise_id, weight_kg, reps, set_order")
    .in("exercise_id", exerciseIds)
    .in("workout_id", workoutIds)
    .order("set_order", { ascending: true });

  if (setsError) {
    throw new Error(`Failed to fetch previous sets: ${setsError.message}`);
  }

  const setsByExerciseAndWorkout = new Map<string, PreviousSessionSet[]>();
  for (const set of sets ?? []) {
    const key = `${set.exercise_id}:${set.workout_id}`;
    const list = setsByExerciseAndWorkout.get(key) ?? [];
    list.push({
      weight: set.weight_kg,
      reps: set.reps,
      set_order: set.set_order,
    });
    setsByExerciseAndWorkout.set(key, list);
  }

  for (const exerciseId of exerciseIds) {
    for (const workout of relevantWorkouts) {
      const previousSets = setsByExerciseAndWorkout.get(
        `${exerciseId}:${workout.id}`,
      );
      if (previousSets && previousSets.length > 0) {
        result[exerciseId] = {
          workoutDate: workout.date,
          sets: previousSets.sort((a, b) => a.set_order - b.set_order),
        };
        break;
      }
    }
  }

  return result;
}

export async function getPreviousExerciseSession(
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<PreviousExerciseSession | null> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const sessions = await getPreviousSessionsByExercise(
    supabase,
    userId,
    [exerciseId],
    excludeWorkoutId,
  );
  return sessions[exerciseId] ?? null;
}

export type PreviousTopSet = {
  weightKg: number;
  reps: number;
  workoutDate: string;
  cycleDay: number;
};

async function getPreviousTopSetsByExercise(
  supabase: SupabaseClient,
  userId: string,
  exerciseIds: string[],
  cycleDay: number,
  excludeWorkoutId?: string,
): Promise<Record<string, PreviousTopSet | null>> {
  const result: Record<string, PreviousTopSet | null> = {};
  for (const exerciseId of exerciseIds) {
    result[exerciseId] = null;
  }

  if (exerciseIds.length === 0) {
    return result;
  }

  const { data: completedWorkouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("id, date, cycle_day")
    .eq("user_id", userId)
    .eq("cycle_day", cycleDay)
    .not("completed_at", "is", null)
    .order("date", { ascending: false });

  if (workoutsError) {
    throw new Error(
      `Failed to fetch previous top set workouts: ${workoutsError.message}`,
    );
  }

  const relevantWorkouts = (completedWorkouts ?? []).filter(
    (workout) => workout.id !== excludeWorkoutId,
  );

  if (relevantWorkouts.length === 0) {
    return result;
  }

  const workoutIds = relevantWorkouts.map((workout) => workout.id);

  const { data: sets, error: setsError } = await supabase
    .from("sets")
    .select("workout_id, exercise_id, weight_kg, reps, set_order")
    .in("exercise_id", exerciseIds)
    .eq("set_category", "top_set")
    .in("workout_id", workoutIds)
    .not("weight_kg", "is", null)
    .order("set_order", { ascending: true });

  if (setsError) {
    throw new Error(`Failed to fetch previous top sets: ${setsError.message}`);
  }

  const setsByExerciseAndWorkout = new Map<string, typeof sets>();
  for (const set of sets ?? []) {
    const key = `${set.exercise_id}:${set.workout_id}`;
    const list = setsByExerciseAndWorkout.get(key) ?? [];
    list.push(set);
    setsByExerciseAndWorkout.set(key, list);
  }

  for (const exerciseId of exerciseIds) {
    for (const workout of relevantWorkouts) {
      const topSets = setsByExerciseAndWorkout.get(`${exerciseId}:${workout.id}`);
      if (!topSets || topSets.length === 0) continue;
      const topSet = topSets[0];
      if (topSet.weight_kg == null) continue;
      result[exerciseId] = {
        weightKg: Number(topSet.weight_kg),
        reps: topSet.reps,
        workoutDate: workout.date,
        cycleDay: workout.cycle_day,
      };
      break;
    }
  }

  return result;
}

/**
 * Finds the Top Set from the most recent completed workout on the same
 * cycle day (e.g. Push A → cycle_day 1) for the given exercise.
 */
export async function getPreviousTopSet(
  exerciseId: string,
  cycleDay: number,
  excludeWorkoutId?: string,
): Promise<PreviousTopSet | null> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const topSets = await getPreviousTopSetsByExercise(
    supabase,
    userId,
    [exerciseId],
    cycleDay,
    excludeWorkoutId,
  );
  return topSets[exerciseId] ?? null;
}

export type TodayWorkoutData = {
  cycleDay: number;
  programLabel: string | null;
  exercises: Exercise[];
  workout: Workout | null;
  sets: Set[];
  todayNotesByExercise: Record<string, string>;
  previousNotesByExercise: Record<string, string>;
  previousSessionsByExercise: Record<string, PreviousExerciseSession | null>;
  previousTopSetByExercise: Record<string, PreviousTopSet | null>;
};

export async function getTodaysWorkout(): Promise<Workout> {
  return getOrCreateTodayWorkout();
}

export async function getTodayWorkoutData(): Promise<TodayWorkoutData> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  // The row itself is the source of truth: it is seeded from the previous
  // workout's cycle day and can be overridden manually for today.
  const workout = await getOrCreateTodayWorkout();
  const cycleDay = workout.cycle_day;
  const programDay = getProgramDay(cycleDay);

  if (!programDay) {
    return {
      cycleDay,
      programLabel: null,
      exercises: [],
      workout,
      sets: [],
      todayNotesByExercise: {},
      previousNotesByExercise: {},
      previousSessionsByExercise: {},
      previousTopSetByExercise: {},
    };
  }

  const { data: exercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .in("slug", [...programDay.exerciseSlugs]);

  if (exercisesError) {
    throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
  }

  const orderedExercises = orderExercisesByProgram(
    exercises ?? [],
    programDay.exerciseSlugs,
  );

  const { data: setsData, error: setsError } = await supabase
    .from("sets")
    .select("*")
    .eq("workout_id", workout.id)
    .order("set_order", { ascending: true });

  if (setsError) {
    throw new Error(`Failed to fetch sets: ${setsError.message}`);
  }

  const sets = setsData ?? [];

  const { data: notesData, error: notesError } = await supabase
    .from("exercise_notes")
    .select("*")
    .eq("workout_id", workout.id);

  if (notesError) {
    throw new Error(`Failed to fetch notes: ${notesError.message}`);
  }

  const todayNotesByExercise = Object.fromEntries(
    (notesData ?? []).map((note) => [note.exercise_id, note.note]),
  );

  const exerciseIds = orderedExercises.map((exercise) => exercise.id);

  const previousNotesByExercise = await getPreviousNotesByExercise(
    supabase,
    userId,
    exerciseIds,
    workout.id,
  );

  const previousSessionsByExercise = await getPreviousSessionsByExercise(
    supabase,
    userId,
    exerciseIds,
    workout.id,
  );

  const previousTopSetByExercise = await getPreviousTopSetsByExercise(
    supabase,
    userId,
    exerciseIds,
    cycleDay,
    workout.id,
  );

  return {
    cycleDay,
    programLabel: programDay.label,
    exercises: orderedExercises,
    workout,
    sets,
    todayNotesByExercise,
    previousNotesByExercise,
    previousSessionsByExercise,
    previousTopSetByExercise,
  };
}

export async function updateWorkoutCycleDay(
  workoutId: string,
  newCycleDay: number,
): Promise<{ workout: Workout; error?: undefined } | { workout: null; error: string }> {
  if (!Number.isInteger(newCycleDay) || newCycleDay < 1 || newCycleDay > 14) {
    return { workout: null, error: "Cycle day must be an integer between 1 and 14." };
  }

  const supabase = createServerSupabaseClient();

  const { data: workout, error } = await supabase
    .from("workouts")
    .update({ cycle_day: newCycleDay })
    .eq("id", workoutId)
    .select("*")
    .single();

  if (error || !workout) {
    return {
      workout: null,
      error: error?.message ?? "Failed to update workout cycle day",
    };
  }

  revalidatePath("/today");
  return { workout };
}

export async function finishWorkout(
  workoutId: string,
): Promise<{ workout: Workout; error?: undefined } | { workout: null; error: string }> {
  const supabase = createServerSupabaseClient();

  const { data: workout, error } = await supabase
    .from("workouts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", workoutId)
    .select("*")
    .single();

  if (error || !workout) {
    return { workout: null, error: error?.message ?? "Failed to finish workout" };
  }

  revalidatePath("/today");
  revalidatePath("/history");
  return { workout };
}

export async function incrementWaterMl(
  amountMl: number = WATER_INCREMENT_ML,
): Promise<
  | { waterMl: number; workout: Workout; error?: undefined }
  | { waterMl: null; workout: null; error: string }
> {
  if (!Number.isFinite(amountMl) || amountMl <= 0) {
    return { waterMl: null, workout: null, error: "Water amount must be positive." };
  }

  const amount = Math.round(amountMl);
  const supabase = createServerSupabaseClient();

  let todayWorkout: Workout;
  try {
    todayWorkout = await getOrCreateTodayWorkout();
  } catch (cause) {
    return {
      waterMl: null,
      workout: null,
      error:
        cause instanceof Error
          ? cause.message
          : "Failed to prepare today's workout for water tracking.",
    };
  }

  const { data: newTotal, error } = await supabase.rpc("increment_workout_water", {
    p_workout_id: todayWorkout.id,
    p_amount: amount,
  });

  if (error || typeof newTotal !== "number") {
    return {
      waterMl: null,
      workout: null,
      error: error?.message ?? "Failed to increment water intake.",
    };
  }

  const workout: Workout = {
    ...todayWorkout,
    water_ml: newTotal,
  };

  revalidatePath("/today");
  return { waterMl: newTotal, workout };
}

type UpsertSetInput = {
  id?: string;
  workoutId: string;
  exerciseId: string;
  setCategory: SetCategory;
  weight: number | null;
  reps: number;
  setOrder: number;
  restSeconds?: number | null;
};

export async function upsertSet(
  input: UpsertSetInput,
): Promise<{ set: Set; error?: undefined } | { set: null; error: string }> {
  const supabase = createServerSupabaseClient();

  const payload = {
    workout_id: input.workoutId,
    exercise_id: input.exerciseId,
    set_category: input.setCategory,
    weight_kg: input.weight,
    reps: input.reps,
    set_order: input.setOrder,
    rest_seconds: input.restSeconds ?? null,
  };

  if (input.id) {
    const { data: set, error } = await supabase
      .from("sets")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error || !set) {
      return { set: null, error: error?.message ?? "Failed to update set" };
    }

    revalidatePath("/today");
    return { set };
  }

  const { data: set, error } = await supabase
    .from("sets")
    .insert(payload)
    .select("*")
    .single();

  if (error || !set) {
    return { set: null, error: error?.message ?? "Failed to create set" };
  }

  revalidatePath("/today");
  return { set };
}

export async function deleteSet(
  setId: string,
): Promise<{ success: true; error?: undefined } | { success: false; error: string }> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("sets").delete().eq("id", setId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/today");
  return { success: true };
}

type UpsertExerciseNoteInput = {
  workoutId: string;
  exerciseId: string;
  note: string;
};

export async function upsertExerciseNote(
  input: UpsertExerciseNoteInput,
): Promise<{ success: true; error?: undefined } | { success: false; error: string }> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("exercise_notes").upsert(
    {
      workout_id: input.workoutId,
      exercise_id: input.exerciseId,
      note: input.note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workout_id,exercise_id" },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/today");
  revalidatePath("/history");
  return { success: true };
}
