import type { LocalSet } from "@/features/fitness/components/workout/SetRow";
import type { TodayWorkoutData } from "@/features/fitness/actions/workout";
import type { Exercise, Set as DbSet } from "@/lib/supabase/types";
import { buildSmartWarmups } from "@/lib/utils/warmups";

export const SAVE_DEBOUNCE_MS = 3000;
export const SAVE_FLASH_MS = 3800;

export function createLocalId() {
  return `local-${crypto.randomUUID()}`;
}

export function getRestSecondsForSet(
  exerciseSets: LocalSet[],
  localId: string,
  restElapsedByPrecedingSet: Record<string, number>,
  fallbackRestSeconds: number | null | undefined,
): number | null {
  const setIndex = exerciseSets.findIndex((set) => set.localId === localId);
  if (setIndex <= 0) return null;

  const precedingLocalId = exerciseSets[setIndex - 1].localId;
  if (precedingLocalId in restElapsedByPrecedingSet) {
    return restElapsedByPrecedingSet[precedingLocalId];
  }
  return fallbackRestSeconds ?? null;
}

export function toLocalSet(set: DbSet): LocalSet {
  return {
    localId: set.id,
    id: set.id,
    set_category: set.set_category,
    weight: set.weight_kg,
    reps: set.reps,
    set_order: set.set_order,
    restSeconds: set.rest_seconds,
    dirty: false,
    saving: false,
  };
}

export function createEmptySet(setOrder: number): LocalSet {
  return {
    localId: createLocalId(),
    set_category: "working_set",
    weight: null,
    reps: null,
    set_order: setOrder,
    dirty: true,
    saving: false,
  };
}

export function createSmartWarmupSet(
  setOrder: number,
  weightKg: number,
  reps: number,
): LocalSet {
  return {
    localId: createLocalId(),
    set_category: "warmup",
    weight: weightKg,
    reps,
    set_order: setOrder,
    isSmartWarmup: true,
    dirty: true,
    saving: false,
  };
}

export function renumberSets(sets: LocalSet[]): LocalSet[] {
  return sets.map((set, index) => ({
    ...set,
    set_order: index + 1,
    dirty: true,
  }));
}

export function insertSmartWarmups(
  sets: LocalSet[],
  previousTopWeightKg: number,
  exercise: Pick<Exercise, "slug" | "name">,
  topSetLocalId?: string,
): { nextSets: LocalSet[]; removedIds: string[] } {
  const prescriptions = buildSmartWarmups(previousTopWeightKg, exercise);
  const removedIds = sets
    .filter((set) => set.isSmartWarmup && set.id)
    .map((set) => set.id!);
  const withoutSmart = sets
    .filter((set) => !set.isSmartWarmup)
    .map((set) =>
      set.noRecentWarmupData ? { ...set, noRecentWarmupData: false } : set,
    );

  let topSetIndex =
    topSetLocalId != null
      ? withoutSmart.findIndex((set) => set.localId === topSetLocalId)
      : -1;
  if (topSetIndex < 0) {
    topSetIndex = withoutSmart.findIndex(
      (set) => set.set_category === "top_set",
    );
  }

  const smartWarmups = prescriptions.map((prescription, index) =>
    createSmartWarmupSet(index + 1, prescription.weightKg, prescription.reps),
  );

  const merged =
    topSetIndex >= 0
      ? [
          ...withoutSmart.slice(0, topSetIndex),
          ...smartWarmups,
          withoutSmart[topSetIndex],
          ...withoutSmart.slice(topSetIndex + 1),
        ]
      : [...smartWarmups, ...withoutSmart];

  return { nextSets: renumberSets(merged), removedIds };
}

export function supportsSmartWarmups(exercise: Exercise): boolean {
  return exercise.category === "barbell";
}

export function groupSetsByExercise(
  exercises: TodayWorkoutData["exercises"],
  sets: DbSet[],
): Record<string, LocalSet[]> {
  const grouped: Record<string, LocalSet[]> = {};

  for (const exercise of exercises) {
    grouped[exercise.id] = [];
  }

  for (const set of sets) {
    if (!grouped[set.exercise_id]) {
      grouped[set.exercise_id] = [];
    }
    grouped[set.exercise_id].push(toLocalSet(set));
  }

  for (const exerciseId of Object.keys(grouped)) {
    grouped[exerciseId].sort((a, b) => a.set_order - b.set_order);
  }

  return grouped;
}
