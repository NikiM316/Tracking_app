export type {
  CompositeTypes,
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.generated";
export { Constants } from "./database.generated";
export * from "./finance-types";
export * from "./monk-types";

import type { Enums, Tables } from "./database.generated";

export type ExerciseCategory = Enums<"exercise_category">;
export type SetCategory = Enums<"set_category">;
export type Exercise = Tables<"exercises">;
export type Workout = Tables<"workouts">;
export type Set = Tables<"sets">;
export type ExerciseNote = Tables<"exercise_notes">;
