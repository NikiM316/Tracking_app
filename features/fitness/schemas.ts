import * as z from "zod";

import { Constants } from "@/lib/supabase/database.generated";
import { uuidSchema } from "@/lib/validation";

export const setCategorySchema = z.enum(Constants.public.Enums.set_category);

export const cycleDaySchema = z
  .number({ error: "Cycle day must be an integer between 1 and 14." })
  .int("Cycle day must be an integer between 1 and 14.")
  .min(1, "Cycle day must be an integer between 1 and 14.")
  .max(14, "Cycle day must be an integer between 1 and 14.");

export const updateWorkoutCycleDaySchema = z.object({
  workoutId: uuidSchema,
  cycleDay: cycleDaySchema,
});

export const finishWorkoutSchema = z.object({
  workoutId: uuidSchema,
});

export const incrementWaterMlSchema = z.object({
  amountMl: z
    .number({ error: "Water amount must be positive." })
    .finite("Water amount must be positive.")
    .positive("Water amount must be positive."),
});

export const upsertSetSchema = z.object({
  id: uuidSchema.optional(),
  workoutId: uuidSchema,
  exerciseId: uuidSchema,
  setCategory: setCategorySchema,
  weight: z.number().finite().nullable(),
  reps: z
    .number({ error: "Reps must be a positive integer." })
    .int("Reps must be a positive integer.")
    .positive("Reps must be a positive integer."),
  setOrder: z
    .number({ error: "Set order must be a positive integer." })
    .int("Set order must be a positive integer.")
    .positive("Set order must be a positive integer."),
  restSeconds: z.number().int().nonnegative().nullable().optional(),
});

export const deleteSetSchema = z.object({
  setId: uuidSchema,
});

export const upsertExerciseNoteSchema = z.object({
  workoutId: uuidSchema,
  exerciseId: uuidSchema,
  note: z.string(),
});

export const getExerciseProgressSchema = uuidSchema;

export type UpsertSetInput = z.infer<typeof upsertSetSchema>;
export type UpsertExerciseNoteInput = z.infer<typeof upsertExerciseNoteSchema>;
