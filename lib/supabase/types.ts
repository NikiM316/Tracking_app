export type ExerciseCategory = "barbell" | "calisthenics" | "cardio";

export type SetCategory = "top_set" | "back_off";

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
  cns_readiness: number | null;
  date: string;
  created_at: string;
};

export type Set = {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_category: SetCategory;
  weight: number | null;
  reps: number;
  rpe: number | null;
  set_order: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
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
        Insert: Omit<Workout, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      exercise_category: ExerciseCategory;
      set_category: SetCategory;
    };
    CompositeTypes: Record<string, never>;
  };
};
