"use server";

import { revalidatePath } from "next/cache";

import { getProgramDay } from "@/lib/program/cycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Exercise, Set, SetCategory, Workout } from "@/lib/supabase/types";
import { getCycleAnchorDate, getCycleDay } from "@/lib/utils/cycle-day";
import { PLACEHOLDER_USER_ID } from "@/lib/utils/placeholder-user";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

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

export async function getPreviousExerciseSession(
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<PreviousExerciseSession | null> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

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
    return null;
  }

  const workoutIds = relevantWorkouts.map((workout) => workout.id);

  const { data: sets, error: setsError } = await supabase
    .from("sets")
    .select("workout_id, weight_kg, reps, set_order")
    .eq("exercise_id", exerciseId)
    .in("workout_id", workoutIds)
    .order("set_order", { ascending: true });

  if (setsError) {
    throw new Error(`Failed to fetch previous sets: ${setsError.message}`);
  }

  const setsByWorkoutId = new Map<string, PreviousSessionSet[]>();

  for (const set of sets ?? []) {
    const list = setsByWorkoutId.get(set.workout_id) ?? [];
    list.push({
      weight: set.weight_kg,
      reps: set.reps,
      set_order: set.set_order,
    });
    setsByWorkoutId.set(set.workout_id, list);
  }

  for (const workout of relevantWorkouts) {
    const previousSets = setsByWorkoutId.get(workout.id);
    if (previousSets && previousSets.length > 0) {
      return {
        workoutDate: workout.date,
        sets: previousSets.sort((a, b) => a.set_order - b.set_order),
      };
    }
  }

  return null;
}

export type TodayWorkoutData = {
  cycleDay: number;
  programLabel: string | null;
  exercises: Exercise[];
  workout: Workout | null;
  sets: Set[];
  todayNotesByExercise: Record<string, string>;
  previousNotesByExercise: Record<string, string>;
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
      todayNotesByExercise: {},
      previousNotesByExercise: {},
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
  let todayNotesByExercise: Record<string, string> = {};

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

    const { data: notesData, error: notesError } = await supabase
      .from("exercise_notes")
      .select("*")
      .eq("workout_id", workout.id);

    if (notesError) {
      throw new Error(`Failed to fetch notes: ${notesError.message}`);
    }

    todayNotesByExercise = Object.fromEntries(
      (notesData ?? []).map((note) => [note.exercise_id, note.note]),
    );
  }

  const previousNotesByExercise = await getPreviousNotesByExercise(
    supabase,
    userId,
    orderedExercises.map((exercise) => exercise.id),
    workout?.id,
  );

  return {
    cycleDay,
    programLabel: programDay.label,
    exercises: orderedExercises,
    workout,
    sets,
    todayNotesByExercise,
    previousNotesByExercise,
  };
}

type UpsertWorkoutInput = {
  cycleDay: number;
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

type UpsertSetInput = {
  id?: string;
  workoutId: string;
  exerciseId: string;
  setCategory: SetCategory;
  weight: number | null;
  reps: number;
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
    weight_kg: input.weight,
    reps: input.reps,
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
