"use server";

import { getExerciseProgress as loadExerciseProgress } from "@/features/fitness/queries/analytics";
import { getExerciseProgressSchema } from "@/features/fitness/schemas";
import type { ExerciseProgressPoint } from "@/features/fitness/types";
import { parseActionInput } from "@/lib/validation";

export async function getExerciseProgress(
  exerciseId: string,
): Promise<ExerciseProgressPoint[]> {
  const parsed = parseActionInput(getExerciseProgressSchema, exerciseId);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return loadExerciseProgress(parsed.data);
}
