import "server-only";

import { getOrCreateTodayWorkout } from "@/features/fitness/lib/today-workout";
import type {
  PreviousExerciseSession,
  PreviousSessionSet,
  PreviousTopSet,
  TodayWorkoutData,
} from "@/features/fitness/types";
import { CYCLE_PROGRAM, getProgramDay } from "@/lib/program/cycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Exercise, Workout } from "@/lib/supabase/types";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

/** Two 14-day cycles is enough to find the previous session/note per exercise. */
const PREVIOUS_SESSION_LOOKBACK = CYCLE_PROGRAM.length * 2;

const EXERCISE_COLUMNS = "id, name, slug, category, created_at" as const;
const SET_COLUMNS =
  "id, workout_id, exercise_id, set_category, weight_kg, reps, set_order, rest_seconds, created_at" as const;
const PREVIOUS_SESSION_SET_COLUMNS =
  "workout_id, exercise_id, weight_kg, reps, set_order" as const;
const PREVIOUS_NOTE_COLUMNS = "workout_id, exercise_id, note" as const;
const TODAY_NOTE_COLUMNS = "exercise_id, note" as const;

type CompletedWorkoutPreview = {
  id: string;
  date: string;
  cycle_day: number;
};

function orderExercisesByProgram(
  exercises: Exercise[],
  slugs: readonly string[],
): Exercise[] {
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));

  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((exercise): exercise is Exercise => exercise !== undefined);
}

async function listRecentCompletedWorkouts(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit: number;
    excludeWorkoutId?: string;
    cycleDay?: number;
  },
): Promise<CompletedWorkoutPreview[]> {
  let query = supabase
    .from("workouts")
    .select("id, date, cycle_day")
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  if (options.excludeWorkoutId) {
    query = query.neq("id", options.excludeWorkoutId);
  }
  if (options.cycleDay != null) {
    query = query.eq("cycle_day", options.cycleDay);
  }

  const { data, error } = await query
    .order("date", { ascending: false })
    .limit(options.limit);

  if (error) {
    throw new Error(`Failed to fetch workout history: ${error.message}`);
  }

  return (data ?? []).flatMap((row) =>
    row.cycle_day == null
      ? []
      : [{ id: row.id, date: row.date, cycle_day: row.cycle_day }],
  );
}

async function getPreviousNotesByExercise(
  supabase: SupabaseClient,
  exerciseIds: string[],
  completedWorkouts: CompletedWorkoutPreview[],
): Promise<Record<string, string>> {
  if (exerciseIds.length === 0 || completedWorkouts.length === 0) {
    return {};
  }

  const dateByWorkoutId = new Map(
    completedWorkouts.map((candidate) => [candidate.id, candidate.date]),
  );
  const workoutIds = completedWorkouts.map((candidate) => candidate.id);

  const { data: notes, error: notesError } = await supabase
    .from("exercise_notes")
    .select(PREVIOUS_NOTE_COLUMNS)
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

async function getPreviousSessionsByExercise(
  supabase: SupabaseClient,
  exerciseIds: string[],
  completedWorkouts: CompletedWorkoutPreview[],
): Promise<Record<string, PreviousExerciseSession | null>> {
  const result: Record<string, PreviousExerciseSession | null> = {};
  for (const exerciseId of exerciseIds) {
    result[exerciseId] = null;
  }

  if (exerciseIds.length === 0 || completedWorkouts.length === 0) {
    return result;
  }

  const workoutIds = completedWorkouts.map((workout) => workout.id);

  const { data: sets, error: setsError } = await supabase
    .from("sets")
    .select(PREVIOUS_SESSION_SET_COLUMNS)
    .in("exercise_id", exerciseIds)
    .in("workout_id", workoutIds)
    .order("set_order", { ascending: true });

  if (setsError) {
    throw new Error(`Failed to fetch previous sets: ${setsError.message}`);
  }

  const setsByExerciseAndWorkout = new Map<string, PreviousSessionSet[]>();
  for (const set of sets ?? []) {
    if (set.exercise_id == null || set.workout_id == null) {
      continue;
    }
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
    for (const workout of completedWorkouts) {
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

async function getPreviousTopSetsByExercise(
  supabase: SupabaseClient,
  exerciseIds: string[],
  completedWorkouts: CompletedWorkoutPreview[],
): Promise<Record<string, PreviousTopSet | null>> {
  const result: Record<string, PreviousTopSet | null> = {};
  for (const exerciseId of exerciseIds) {
    result[exerciseId] = null;
  }

  if (exerciseIds.length === 0 || completedWorkouts.length === 0) {
    return result;
  }

  const workoutIds = completedWorkouts.map((workout) => workout.id);

  const { data: sets, error: setsError } = await supabase
    .from("sets")
    .select(PREVIOUS_SESSION_SET_COLUMNS)
    .in("exercise_id", exerciseIds)
    .eq("set_category", "top_set")
    .in("workout_id", workoutIds)
    .not("weight_kg", "is", null)
    .order("set_order", { ascending: true });

  if (setsError) {
    throw new Error(`Failed to fetch previous top sets: ${setsError.message}`);
  }

  const setsByExerciseAndWorkout = new Map<string, NonNullable<typeof sets>>();
  for (const set of sets ?? []) {
    if (set.exercise_id == null || set.workout_id == null) {
      continue;
    }
    const key = `${set.exercise_id}:${set.workout_id}`;
    const list = setsByExerciseAndWorkout.get(key) ?? [];
    list.push(set);
    setsByExerciseAndWorkout.set(key, list);
  }

  for (const exerciseId of exerciseIds) {
    for (const workout of completedWorkouts) {
      const topSets = setsByExerciseAndWorkout.get(`${exerciseId}:${workout.id}`);
      if (!topSets || topSets.length === 0) continue;
      const topSet = topSets[0];
      if (topSet.weight_kg == null || topSet.reps == null) continue;
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

export async function getTodaysWorkout(): Promise<Workout> {
  return getOrCreateTodayWorkout();
}

export async function getTodayWorkoutData(): Promise<TodayWorkoutData> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const workout = await getOrCreateTodayWorkout();
  const cycleDay = workout.cycle_day ?? 1;
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

  const [
    { data: exercises, error: exercisesError },
    { data: setsData, error: setsError },
    { data: notesData, error: notesError },
    recentCompletedWorkouts,
    previousSameCycleWorkouts,
  ] = await Promise.all([
    supabase
      .from("exercises")
      .select(EXERCISE_COLUMNS)
      .in("slug", [...programDay.exerciseSlugs]),
    supabase
      .from("sets")
      .select(SET_COLUMNS)
      .eq("workout_id", workout.id)
      .order("set_order", { ascending: true }),
    supabase
      .from("exercise_notes")
      .select(TODAY_NOTE_COLUMNS)
      .eq("workout_id", workout.id),
    listRecentCompletedWorkouts(supabase, userId, {
      limit: PREVIOUS_SESSION_LOOKBACK,
      excludeWorkoutId: workout.id,
    }),
    listRecentCompletedWorkouts(supabase, userId, {
      limit: 1,
      excludeWorkoutId: workout.id,
      cycleDay,
    }),
  ]);

  if (exercisesError) {
    throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
  }
  if (setsError) {
    throw new Error(`Failed to fetch sets: ${setsError.message}`);
  }
  if (notesError) {
    throw new Error(`Failed to fetch notes: ${notesError.message}`);
  }

  const orderedExercises = orderExercisesByProgram(
    exercises ?? [],
    programDay.exerciseSlugs,
  );
  const sets = setsData ?? [];
  const todayNotesByExercise = Object.fromEntries(
    (notesData ?? []).map((note) => [note.exercise_id, note.note]),
  );
  const exerciseIds = orderedExercises.map((exercise) => exercise.id);

  const [
    previousNotesByExercise,
    previousSessionsByExercise,
    previousTopSetByExercise,
  ] = await Promise.all([
    getPreviousNotesByExercise(supabase, exerciseIds, recentCompletedWorkouts),
    getPreviousSessionsByExercise(
      supabase,
      exerciseIds,
      recentCompletedWorkouts,
    ),
    getPreviousTopSetsByExercise(
      supabase,
      exerciseIds,
      previousSameCycleWorkouts,
    ),
  ]);

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
