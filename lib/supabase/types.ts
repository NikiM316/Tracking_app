import type { FinanceEnums, FinanceTables } from "./finance-types";

export * from "./finance-types";

export type ExerciseCategory = "barbell" | "calisthenics" | "cardio" | "mobility";

export type SetCategory =
  | "warmup"
  | "top_set"
  | "back_off"
  | "working_set"
  | "zone_2";

export type Exercise = {
  id: string;
  name: string;
  slug: string;
  category: ExerciseCategory;
  created_at: string;
};

export type Workout = {
  id: string;
  user_id: string;
  cycle_day: number;
  date: string;
  completed_at: string | null;
  water_ml: number;
  created_at: string;
};

export type Set = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_category: SetCategory;
  weight_kg: number | null;
  reps: number;
  set_order: number;
  rest_seconds: number | null;
  created_at: string;
};

export type ExerciseNote = {
  id: string;
  workout_id: string;
  exercise_id: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: FinanceTables & {
      exercises: {
        Row: Exercise;
        Insert: Omit<Exercise, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Exercise, "id">>;
        Relationships: [];
      };
      workouts: {
        Row: Workout;
        Insert: Omit<Workout, "id" | "created_at" | "completed_at" | "water_ml"> & {
          id?: string;
          created_at?: string;
          completed_at?: string | null;
          water_ml?: number;
        };
        Update: Partial<Omit<Workout, "id">>;
        Relationships: [];
      };
      sets: {
        Row: Set;
        Insert: Omit<Set, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Set, "id">>;
        Relationships: [];
      };
      exercise_notes: {
        Row: ExerciseNote;
        Insert: Omit<ExerciseNote, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ExerciseNote, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_workout_water: {
        Args: {
          p_workout_id: string;
          p_amount: number;
        };
        Returns: number;
      };
    };
    Enums: FinanceEnums & {
      exercise_category: ExerciseCategory;
      set_category: SetCategory;
    };
    CompositeTypes: Record<string, never>;
  };
};
