"use server";

import { getProgramDay } from "@/lib/program/cycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Exercise, Set as DbSet, Workout } from "@/lib/supabase/types";
import { PLACEHOLDER_USER_ID } from "@/lib/utils/placeholder-user";

function getPlaceholderUserId(): string {
  return process.env.PLACEHOLDER_USER_ID ?? PLACEHOLDER_USER_ID;
}

export type HistoryExerciseEntry = {
  exercise: Exercise;
  sets: DbSet[];
  note: string | null;
};

export type HistoryWorkoutEntry = {
  workout: Workout;
  programLabel: string;
  exercises: HistoryExerciseEntry[];
};

export async function getWorkoutHistory(): Promise<HistoryWorkoutEntry[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("date", { ascending: false });

  if (workoutsError) {
    throw new Error(`Failed to fetch workout history: ${workoutsError.message}`);
  }

  if (!workouts || workouts.length === 0) {
    return [];
  }

  const workoutIds = workouts.map((workout) => workout.id);

  const { data: sets, error: setsError } = await supabase
    .from("sets")
    .select("*")
    .in("workout_id", workoutIds)
    .order("set_order", { ascending: true });

  if (setsError) {
    throw new Error(`Failed to fetch sets: ${setsError.message}`);
  }

  const { data: notes, error: notesError } = await supabase
    .from("exercise_notes")
    .select("*")
    .in("workout_id", workoutIds);

  if (notesError) {
    throw new Error(`Failed to fetch notes: ${notesError.message}`);
  }

  const exerciseIds = [...new Set((sets ?? []).map((set) => set.exercise_id))];

  let exercises: Exercise[] = [];

  if (exerciseIds.length > 0) {
    const { data: exercisesData, error: exercisesError } = await supabase
      .from("exercises")
      .select("*")
      .in("id", exerciseIds);

    if (exercisesError) {
      throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
    }

    exercises = exercisesData ?? [];
  }

  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );

  const notesByWorkoutAndExercise = new Map<string, string>();
  for (const note of notes ?? []) {
    notesByWorkoutAndExercise.set(`${note.workout_id}:${note.exercise_id}`, note.note);
  }

  const setsByWorkout = new Map<string, DbSet[]>();
  for (const set of sets ?? []) {
    const list = setsByWorkout.get(set.workout_id) ?? [];
    list.push(set);
    setsByWorkout.set(set.workout_id, list);
  }

  return workouts.map((workout) => {
    const workoutSets = setsByWorkout.get(workout.id) ?? [];
    const exerciseIdsForWorkout = [
      ...new Set(workoutSets.map((set) => set.exercise_id)),
    ];

    const exerciseEntries: HistoryExerciseEntry[] = exerciseIdsForWorkout
      .map((exerciseId) => {
        const exercise = exerciseById.get(exerciseId);
        if (!exercise) return null;

        return {
          exercise,
          sets: workoutSets
            .filter((set) => set.exercise_id === exerciseId)
            .sort((a, b) => a.set_order - b.set_order),
          note: notesByWorkoutAndExercise.get(`${workout.id}:${exerciseId}`) ?? null,
        };
      })
      .filter((entry): entry is HistoryExerciseEntry => entry !== null);

    return {
      workout,
      programLabel: getProgramDay(workout.cycle_day)?.label ?? "Workout",
      exercises: exerciseEntries,
    };
  });
}
