import type { Exercise } from "@/lib/supabase/types";

export const SMART_WARMUP_PRESCRIPTION = [
  { percent: 0.5, reps: 8 },
  { percent: 0.7, reps: 5 },
  { percent: 0.9, reps: 1 },
] as const;

export type WarmupPrescription = {
  weightKg: number;
  reps: number;
  percent: number;
};

export function isDumbbellExercise(exercise: Pick<Exercise, "slug" | "name">): boolean {
  const text = `${exercise.slug} ${exercise.name}`.toLowerCase();
  return (
    text.includes("dumbbell") ||
    text.includes("db-") ||
    text.includes("-db-") ||
    /\bdb\b/.test(text)
  );
}

export function getWarmupWeightIncrement(
  exercise: Pick<Exercise, "slug" | "name">,
): number {
  return isDumbbellExercise(exercise) ? 2 : 2.5;
}

export function roundWarmupWeight(weightKg: number, increment: number): number {
  if (weightKg <= 0) return 0;
  return Math.round(weightKg / increment) * increment;
}

export function buildSmartWarmups(
  topWeightKg: number,
  exercise: Pick<Exercise, "slug" | "name">,
): WarmupPrescription[] {
  const increment = getWarmupWeightIncrement(exercise);

  return SMART_WARMUP_PRESCRIPTION.map(({ percent, reps }) => ({
    percent,
    reps,
    weightKg: roundWarmupWeight(topWeightKg * percent, increment),
  }));
}
