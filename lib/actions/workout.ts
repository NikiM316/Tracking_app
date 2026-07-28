"use server";

import { revalidatePath } from "next/cache";

import { getProgramDay } from "@/lib/program/cycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Exercise, Set, SetCategory, Workout } from "@/lib/supabase/types";
import { getCycleAnchorDate, getCycleDay } from "@/lib/utils/cycle-day";
import { PLACEHOLDER_USER_ID } from "@/lib/utils/placeholder-user";

function getPlaceholderUserId(): string {
  return process.env.PLACEHOLDER_USER_ID ?? PLACEHOLDER_USER_ID;
}

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function orderExercisesByProgram(
  exercises: Exercise[],
  slugs: readonly string[],
): Exercise[] {
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));

  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((exercise): exercise is Exercise => exercise !== undefined);
}

export type TodayWorkoutData = {
  cycleDay: number;
  programLabel: string | null;
  exercises: Exercise[];
  workout: Workout | null;
  sets: Set[];
};

export async function getTodayWorkoutData(): Promise<TodayWorkoutData> {
  const supabase = createServerSupabaseClient();
  const cycleDay = getCycleDay(getCycleAnchorDate());
  const programDay = getProgramDay(cycleDay);
  const workoutDate = getTodayDateString();
  const userId = getPlaceholderUserId();

  if (!programDay) {
    return {
      cycleDay,
      programLabel: null,
      exercises: [],
      workout: null,
      sets: [],
    };
  }

  const { data: exercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .in("slug", [...programDay.exerciseSlugs]);

  if (exercisesError) {
    throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
  }

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("date", workoutDate)
    .maybeSingle();

  if (workoutError) {
    throw new Error(`Failed to fetch workout: ${workoutError.message}`);
  }

  let sets: Set[] = [];

  if (workout) {
    const { data: setsData, error: setsError } = await supabase
      .from("sets")
      .select("*")
      .eq("workout_id", workout.id)
      .order("set_order", { ascending: true });

    if (setsError) {
      throw new Error(`Failed to fetch sets: ${setsError.message}`);
    }

    sets = setsData ?? [];
  }

  return {
    cycleDay,
    programLabel: programDay.label,
    exercises: orderExercisesByProgram(exercises ?? [], programDay.exerciseSlugs),
    workout,
    sets,
  };
}

type UpsertWorkoutInput = {
  cycleDay: number;
  cnsReadiness: number;
  workoutDate?: string;
};

export async function upsertWorkout(
  input: UpsertWorkoutInput,
): Promise<{ workout: Workout; error?: undefined } | { workout: null; error: string }> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const workoutDate = input.workoutDate ?? getTodayDateString();

  const { data: existingWorkout, error: existingError } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("date", workoutDate)
    .maybeSingle();

  if (existingError) {
    return { workout: null, error: existingError.message };
  }

  if (existingWorkout) {
    const { data: workout, error } = await supabase
      .from("workouts")
      .update({
        cycle_day: input.cycleDay,
        cns_readiness: input.cnsReadiness,
      })
      .eq("id", existingWorkout.id)
      .select("*")
      .single();

    if (error || !workout) {
      return { workout: null, error: error?.message ?? "Failed to update workout" };
    }

    revalidatePath("/today");
    return { workout };
  }

  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      cycle_day: input.cycleDay,
      cns_readiness: input.cnsReadiness,
      date: workoutDate,
    })
    .select("*")
    .single();

  if (error || !workout) {
    return { workout: null, error: error?.message ?? "Failed to create workout" };
  }

  revalidatePath("/today");
  return { workout };
}

type UpsertSetInput = {
  id?: string;
  workoutId: string;
  exerciseId: string;
  setCategory: SetCategory;
  weight: number | null;
  reps: number;
  rpe: number | null;
  setOrder: number;
};

export async function upsertSet(
  input: UpsertSetInput,
): Promise<{ set: Set; error?: undefined } | { set: null; error: string }> {
  const supabase = createServerSupabaseClient();

  const payload = {
    workout_id: input.workoutId,
    exercise_id: input.exerciseId,
    set_category: input.setCategory,
    weight: input.weight,
    reps: input.reps,
    rpe: input.rpe,
    set_order: input.setOrder,
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
