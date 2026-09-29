"use server";

import { revalidatePath } from "next/cache";

import {
  deleteSetSchema,
  finishWorkoutSchema,
  updateWorkoutCycleDaySchema,
  upsertExerciseNoteSchema,
  upsertSetSchema,
} from "@/features/fitness/schemas";
import type { UpsertExerciseNoteInput, UpsertSetInput } from "@/features/fitness/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Set, Workout } from "@/lib/supabase/types";
import { parseActionInput } from "@/lib/validation";

export async function updateWorkoutCycleDay(
  workoutId: string,
  newCycleDay: number,
): Promise<{ workout: Workout; error?: undefined } | { workout: null; error: string }> {
  const parsed = parseActionInput(updateWorkoutCycleDaySchema, {
    workoutId,
    cycleDay: newCycleDay,
  });
  if (!parsed.ok) {
    return { workout: null, error: parsed.error };
  }

  const supabase = createServerSupabaseClient();

  const { data: workout, error } = await supabase
    .from("workouts")
    .update({ cycle_day: parsed.data.cycleDay })
    .eq("id", parsed.data.workoutId)
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
  const parsed = parseActionInput(finishWorkoutSchema, { workoutId });
  if (!parsed.ok) {
    return { workout: null, error: parsed.error };
  }

  const supabase = createServerSupabaseClient();

  const { data: workout, error } = await supabase
    .from("workouts")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", parsed.data.workoutId)
    .select("*")
    .single();

  if (error || !workout) {
    return { workout: null, error: error?.message ?? "Failed to finish workout" };
  }

  revalidatePath("/today");
  revalidatePath("/history");
  return { workout };
}

export async function upsertSet(
  input: UpsertSetInput,
): Promise<{ set: Set; error?: undefined } | { set: null; error: string }> {
  const parsed = parseActionInput(upsertSetSchema, input);
  if (!parsed.ok) {
    return { set: null, error: parsed.error };
  }

  const supabase = createServerSupabaseClient();

  const payload = {
    workout_id: parsed.data.workoutId,
    exercise_id: parsed.data.exerciseId,
    set_category: parsed.data.setCategory,
    weight_kg: parsed.data.weight,
    reps: parsed.data.reps,
    set_order: parsed.data.setOrder,
    rest_seconds: parsed.data.restSeconds ?? null,
  };

  if (parsed.data.id) {
    const { data: set, error } = await supabase
      .from("sets")
      .update(payload)
      .eq("id", parsed.data.id)
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
  const parsed = parseActionInput(deleteSetSchema, { setId });
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("sets").delete().eq("id", parsed.data.setId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/today");
  return { success: true };
}

export async function upsertExerciseNote(
  input: UpsertExerciseNoteInput,
): Promise<{ success: true; error?: undefined } | { success: false; error: string }> {
  const parsed = parseActionInput(upsertExerciseNoteSchema, input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("exercise_notes").upsert(
    {
      workout_id: parsed.data.workoutId,
      exercise_id: parsed.data.exerciseId,
      note: parsed.data.note,
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
