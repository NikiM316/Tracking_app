import type { Exercise, Set, Workout } from "@/lib/supabase/types";

export type WorkoutSetView = Pick<
  Set,
  | "id"
  | "workout_id"
  | "exercise_id"
  | "set_category"
  | "weight_kg"
  | "reps"
  | "set_order"
  | "rest_seconds"
  | "created_at"
>;

export type PreviousSessionSet = {
  weight: number | null;
  reps: number | null;
  set_order: number;
};

export type PreviousExerciseSession = {
  workoutDate: string;
  sets: PreviousSessionSet[];
};

export type PreviousTopSet = {
  weightKg: number;
  reps: number;
  workoutDate: string;
  cycleDay: number;
};

export type TodayWorkoutData = {
  cycleDay: number;
  programLabel: string | null;
  exercises: Exercise[];
  workout: Workout | null;
  sets: WorkoutSetView[];
  todayNotesByExercise: Record<string, string>;
  previousNotesByExercise: Record<string, string>;
  previousSessionsByExercise: Record<string, PreviousExerciseSession | null>;
  previousTopSetByExercise: Record<string, PreviousTopSet | null>;
};

export type HistoryExerciseEntry = {
  exercise: Exercise;
  sets: Set[];
  note: string | null;
};

export type HistoryWorkoutEntry = {
  workout: Workout;
  programLabel: string;
  exercises: HistoryExerciseEntry[];
};

export type CycleExercise = {
  slug: string;
  name: string;
};

export type CycleDayOverview = {
  day: number;
  label: string;
  exercises: CycleExercise[];
};

export type CycleOverviewData = {
  currentCycleDay: number;
  days: CycleDayOverview[];
};

export type ExerciseOption = {
  id: string;
  name: string;
  slug: string;
};

export type ExerciseProgressPoint = {
  date: string;
  estimatedOneRepMax: number;
  maxWeight: number;
  bestReps: number;
  bestSetRestSeconds: number | null;
};
