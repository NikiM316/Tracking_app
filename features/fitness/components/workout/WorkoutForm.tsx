"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { ExerciseBlock } from "@/features/fitness/components/workout/ExerciseBlock";
import { clearRestTimerStorage } from "@/features/fitness/components/workout/RestTimer";
import type { LocalSet } from "@/features/fitness/components/workout/SetRow";
import { WaterTracker } from "@/features/fitness/components/workout/WaterTracker";
import { WorkoutCompleteSummary } from "@/features/fitness/components/workout/WorkoutCompleteSummary";
import {
  deleteSet,
  finishWorkout,
  incrementWaterMl,
  upsertExerciseNote,
  upsertSet,
  type TodayWorkoutData,
} from "@/features/fitness/actions/workout";
import type { Exercise, Set as DbSet } from "@/lib/supabase/types";
import { buildSmartWarmups } from "@/lib/utils/warmups";

const SAVE_DEBOUNCE_MS = 3000;
const SAVE_FLASH_MS = 3800;

type WorkoutFormProps = {
  initialData: TodayWorkoutData;
};

function createLocalId() {
  return `local-${crypto.randomUUID()}`;
}

function getRestSecondsForSet(
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

function toLocalSet(set: DbSet): LocalSet {
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

function createEmptySet(setOrder: number): LocalSet {
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

function createSmartWarmupSet(
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

function renumberSets(sets: LocalSet[]): LocalSet[] {
  return sets.map((set, index) => ({
    ...set,
    set_order: index + 1,
    dirty: true,
  }));
}

function insertSmartWarmups(
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

function supportsSmartWarmups(exercise: Exercise): boolean {
  return exercise.category === "barbell";
}

function groupSetsByExercise(
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

export function WorkoutForm({ initialData }: WorkoutFormProps) {
  const [workout, setWorkout] = useState(initialData.workout);
  const [waterMl, setWaterMl] = useState(initialData.workout?.water_ml ?? 0);
  const [optimisticWaterMl, addOptimisticWater] = useOptimistic(
    waterMl,
    (current, amountMl: number) => current + amountMl,
  );
  const [, startWaterTransition] = useTransition();
  const [setsByExercise, setSetsByExercise] = useState(() =>
    groupSetsByExercise(initialData.exercises, initialData.sets),
  );
  const [notesByExercise, setNotesByExercise] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      for (const exercise of initialData.exercises) {
        initial[exercise.id] = initialData.todayNotesByExercise[exercise.id] ?? "";
      }
      return initial;
    },
  );
  const [noteSavingByExercise, setNoteSavingByExercise] = useState<
    Record<string, boolean>
  >({});
  const [noteJustSavedByExercise, setNoteJustSavedByExercise] = useState<
    Record<string, boolean>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const setSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const noteSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const setFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const noteFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSetSaves = useRef<Record<string, { exerciseId: string; set: LocalSet }>>({});
  const pendingNoteSaves = useRef<Record<string, string>>({});
  const workoutIdRef = useRef<string | null>(initialData.workout?.id ?? null);
  const restElapsedByPrecedingSetRef = useRef<Record<string, number>>({});
  const setsByExerciseRef = useRef(setsByExercise);

  const canLogSets = Boolean(workout?.id);

  const exerciseCount = initialData.exercises.length;
  const totalSets = useMemo(
    () => Object.values(setsByExercise).reduce((sum, sets) => sum + sets.length, 0),
    [setsByExercise],
  );


  useEffect(() => {
    workoutIdRef.current = workout?.id ?? null;
  }, [workout?.id]);

  useEffect(() => {
    setsByExerciseRef.current = setsByExercise;
  }, [setsByExercise]);

  // Flush any pending debounced saves to the server if the component unmounts
  // (e.g. navigating to another tab) before the debounce timer fires, so
  // in-progress edits are never silently lost.
  useEffect(() => {
    // Capture mutable maps once; they are mutated in place, so cleanup still
    // sees the latest pending timers / saves at unmount.
    const setSaveTimersMap = setSaveTimers.current;
    const noteSaveTimersMap = noteSaveTimers.current;
    const setFlashTimersMap = setFlashTimers.current;
    const noteFlashTimersMap = noteFlashTimers.current;
    const pendingSetSavesMap = pendingSetSaves.current;
    const pendingNoteSavesMap = pendingNoteSaves.current;
    const restElapsedByPrecedingSet = restElapsedByPrecedingSetRef.current;

    return () => {
      for (const timer of Object.values(setSaveTimersMap)) clearTimeout(timer);
      for (const timer of Object.values(noteSaveTimersMap)) clearTimeout(timer);
      for (const timer of Object.values(setFlashTimersMap)) clearTimeout(timer);
      for (const timer of Object.values(noteFlashTimersMap)) clearTimeout(timer);

      const workoutId = workoutIdRef.current;
      const pending = Object.values(pendingSetSavesMap);
      const flushable = pending.filter(
        (entry) => entry.set.reps != null && entry.set.reps >= 1,
      );

      if (workoutId) {
        for (const { exerciseId, set } of flushable) {
          const exerciseSets = setsByExerciseRef.current[exerciseId] ?? [];
          const restSeconds = getRestSecondsForSet(
            exerciseSets,
            set.localId,
            restElapsedByPrecedingSet,
            set.restSeconds,
          );

          void upsertSet({
            id: set.id,
            workoutId,
            exerciseId,
            setCategory: set.set_category,
            weight: set.weight,
            reps: set.reps!,
            setOrder: set.set_order,
            restSeconds,
          });
        }

        for (const [exerciseId, note] of Object.entries(pendingNoteSavesMap)) {
          void upsertExerciseNote({ workoutId, exerciseId, note });
        }
      }

      pendingSetSaves.current = {};
      pendingNoteSaves.current = {};
    };
  }, []);

  function updateExerciseSets(
    exerciseId: string,
    updater: (sets: LocalSet[]) => LocalSet[],
  ) {
    setSetsByExercise((current) => ({
      ...current,
      [exerciseId]: updater(current[exerciseId] ?? []),
    }));
  }

  function scheduleSetSave(exerciseId: string, localId: string, next: LocalSet) {
    pendingSetSaves.current[localId] = { exerciseId, set: next };

    if (setSaveTimers.current[localId]) {
      clearTimeout(setSaveTimers.current[localId]);
    }
    setSaveTimers.current[localId] = setTimeout(() => {
      delete setSaveTimers.current[localId];
      delete pendingSetSaves.current[localId];
      handleSaveSet(exerciseId, localId, next);
    }, SAVE_DEBOUNCE_MS);
  }

  function handleAddSet(exerciseId: string) {
    const currentSets = setsByExercise[exerciseId] ?? [];
    const newSet = createEmptySet(currentSets.length + 1);

    updateExerciseSets(exerciseId, (sets) => [...sets, newSet]);
    scheduleSetSave(exerciseId, newSet.localId, newSet);
  }

  function applyAndSaveSets(exerciseId: string, nextSets: LocalSet[]) {
    updateExerciseSets(exerciseId, () => nextSets);
    for (const set of nextSets) {
      if (set.dirty) {
        scheduleSetSave(exerciseId, set.localId, set);
      }
    }
  }

  async function generateWarmupsForTopSet(
    exerciseId: string,
    topSetLocalId: string,
    baseSets: LocalSet[],
  ) {
    const exercise = initialData.exercises.find((item) => item.id === exerciseId);
    if (!exercise || !supportsSmartWarmups(exercise)) return;

    try {
      // Use server-prefetched previous top set so we don't call a Server Action
      // from the client (which would refresh the route and remount the form).
      const previousTop = initialData.previousTopSetByExercise[exerciseId] ?? null;

      if (!previousTop) {
        updateExerciseSets(exerciseId, (sets) => {
          const target =
            sets.find((set) => set.localId === topSetLocalId) ??
            sets.find((set) => set.set_category === "top_set");
          if (!target || target.set_category !== "top_set") return sets;
          return sets.map((set) =>
            set.localId === target.localId
              ? { ...set, noRecentWarmupData: true }
              : set,
          );
        });
        return;
      }

      const { nextSets, removedIds } = insertSmartWarmups(
        baseSets,
        previousTop.weightKg,
        exercise,
        topSetLocalId,
      );

      for (const setId of removedIds) {
        void deleteSet(setId);
      }

      applyAndSaveSets(exerciseId, nextSets);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to generate warm-up sets.",
      );
    }
  }

  function handleChangeSet(exerciseId: string, localId: string, next: LocalSet) {
    const exercise = initialData.exercises.find((item) => item.id === exerciseId);
    const currentSets = setsByExercise[exerciseId] ?? [];
    const previous = currentSets.find((set) => set.localId === localId);

    // Manual edits to category take the set out of smart warm-up tracking.
    let nextSet =
      next.isSmartWarmup && next.set_category !== "warmup"
        ? { ...next, isSmartWarmup: false }
        : next;

    // Clear the no-data hint when leaving Top set.
    if (nextSet.noRecentWarmupData && nextSet.set_category !== "top_set") {
      nextSet = { ...nextSet, noRecentWarmupData: false };
    }

    const nextSets = currentSets.map((set) =>
      set.localId === localId ? nextSet : set,
    );

    const becameTopSet =
      previous != null &&
      previous.set_category !== "top_set" &&
      nextSet.set_category === "top_set";

    updateExerciseSets(exerciseId, () => nextSets);
    scheduleSetSave(exerciseId, localId, nextSet);

    // Selecting Top set auto-generates warm-ups from the previous top-set weight.
    if (becameTopSet && exercise && supportsSmartWarmups(exercise)) {
      void generateWarmupsForTopSet(exerciseId, localId, nextSets);
    }
  }

  function handleRestElapsedChange(precedingSetLocalId: string, seconds: number) {
    restElapsedByPrecedingSetRef.current[precedingSetLocalId] = seconds;
  }

  function handleSaveSet(exerciseId: string, localId: string, target: LocalSet) {
    const reps = target.reps;
    if (!workout?.id || reps == null || reps < 1) {
      return;
    }

    setErrorMessage(null);

    const exerciseSets = setsByExercise[exerciseId] ?? [];
    const restSeconds = getRestSecondsForSet(
      exerciseSets,
      localId,
      restElapsedByPrecedingSetRef.current,
      target.restSeconds,
    );

    updateExerciseSets(exerciseId, (sets) =>
      sets.map((set) =>
        set.localId === localId ? { ...target, saving: true, justSaved: false } : set,
      ),
    );

    (async () => {
      const result = await upsertSet({
        id: target.id,
        workoutId: workout.id,
        exerciseId,
        setCategory: target.set_category,
        weight: target.weight,
        reps,
        setOrder: target.set_order,
        restSeconds,
      });

      if (result.error || !result.set) {
        setErrorMessage(result.error ?? "Failed to save set.");
        updateExerciseSets(exerciseId, (sets) =>
          sets.map((set) =>
            set.localId === localId ? { ...set, saving: false } : set,
          ),
        );
        return;
      }

      // Keep `localId` stable across saves so RestTimer / SetRow are not remounted
      // when upsertSet assigns a DB id (that remount was resetting the rest timer).
      updateExerciseSets(exerciseId, (sets) =>
        sets.map((set) =>
          set.localId === localId
            ? {
                ...toLocalSet(result.set),
                localId,
                justSaved: true,
                isSmartWarmup: set.isSmartWarmup,
                noRecentWarmupData: set.noRecentWarmupData,
              }
            : set,
        ),
      );

      if (setFlashTimers.current[localId]) {
        clearTimeout(setFlashTimers.current[localId]);
      }
      setFlashTimers.current[localId] = setTimeout(() => {
        delete setFlashTimers.current[localId];
        updateExerciseSets(exerciseId, (sets) =>
          sets.map((set) =>
            set.localId === localId ? { ...set, justSaved: false } : set,
          ),
        );
      }, SAVE_FLASH_MS);
    })();
  }

  function handleDeleteSet(exerciseId: string, localId: string) {
    const target = (setsByExercise[exerciseId] ?? []).find(
      (set) => set.localId === localId,
    );

    if (!target) return;

    if (setSaveTimers.current[localId]) {
      clearTimeout(setSaveTimers.current[localId]);
      delete setSaveTimers.current[localId];
    }
    delete pendingSetSaves.current[localId];
    delete restElapsedByPrecedingSetRef.current[localId];
    clearRestTimerStorage(localId);

    setErrorMessage(null);

    if (!target.id) {
      updateExerciseSets(exerciseId, (sets) =>
        sets
          .filter((set) => set.localId !== localId)
          .map((set, index) => ({ ...set, set_order: index + 1, dirty: true })),
      );
      return;
    }

    updateExerciseSets(exerciseId, (sets) =>
      sets.map((set) =>
        set.localId === localId ? { ...set, saving: true } : set,
      ),
    );

    (async () => {
      const result = await deleteSet(target.id!);

      if (!result.success) {
        setErrorMessage(result.error);
        updateExerciseSets(exerciseId, (sets) =>
          sets.map((set) =>
            set.localId === localId ? { ...set, saving: false } : set,
          ),
        );
        return;
      }

      updateExerciseSets(exerciseId, (sets) =>
        sets
          .filter((set) => set.localId !== localId)
          .map((set, index) => ({ ...set, set_order: index + 1 })),
      );
    })();
  }

  function scheduleNoteSave(exerciseId: string, note: string) {
    pendingNoteSaves.current[exerciseId] = note;

    if (noteSaveTimers.current[exerciseId]) {
      clearTimeout(noteSaveTimers.current[exerciseId]);
    }
    noteSaveTimers.current[exerciseId] = setTimeout(() => {
      delete noteSaveTimers.current[exerciseId];
      delete pendingNoteSaves.current[exerciseId];
      handleSaveNote(exerciseId, note);
    }, SAVE_DEBOUNCE_MS);
  }

  function handleChangeNote(exerciseId: string, note: string) {
    setNotesByExercise((current) => ({ ...current, [exerciseId]: note }));
    scheduleNoteSave(exerciseId, note);
  }

  function handleSaveNote(exerciseId: string, note: string) {
    if (!workout?.id) return;

    setErrorMessage(null);
    setNoteSavingByExercise((current) => ({ ...current, [exerciseId]: true }));
    setNoteJustSavedByExercise((current) => ({ ...current, [exerciseId]: false }));

    (async () => {
      const result = await upsertExerciseNote({
        workoutId: workout.id,
        exerciseId,
        note,
      });

      setNoteSavingByExercise((current) => ({ ...current, [exerciseId]: false }));

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setNoteJustSavedByExercise((current) => ({ ...current, [exerciseId]: true }));

      if (noteFlashTimers.current[exerciseId]) {
        clearTimeout(noteFlashTimers.current[exerciseId]);
      }
      noteFlashTimers.current[exerciseId] = setTimeout(() => {
        delete noteFlashTimers.current[exerciseId];
        setNoteJustSavedByExercise((current) => ({ ...current, [exerciseId]: false }));
      }, SAVE_FLASH_MS);
    })();
  }

  function handleFinishWorkout() {
    if (!workout?.id) return;

    setErrorMessage(null);
    setIsFinishing(true);

    (async () => {
      const result = await finishWorkout(workout.id);
      setIsFinishing(false);

      if (result.error || !result.workout) {
        setErrorMessage(result.error ?? "Failed to finish workout.");
        return;
      }

      setWorkout(result.workout);
      setWaterMl(result.workout.water_ml);
    })();
  }

  function handleAddWater(amountMl: number) {
    if (!Number.isFinite(amountMl) || amountMl <= 0) return;

    setErrorMessage(null);
    startWaterTransition(async () => {
      addOptimisticWater(amountMl);
      const result = await incrementWaterMl(amountMl);

      if (result.error || result.workout == null || result.waterMl == null) {
        setErrorMessage(result.error ?? "Failed to update water intake.");
        return;
      }

      setWorkout(result.workout);
      setWaterMl(result.waterMl);
    });
  }

  if (initialData.exercises.length === 0) {
    return (
      <div className="space-y-5">
        <WaterTracker waterMl={optimisticWaterMl} onAdd={handleAddWater} />
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-lg font-semibold text-zinc-50">Rest / unprogrammed day</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Day {initialData.cycleDay} is not in the program yet. Days 3–14 will be
            added later.
          </p>
        </section>
        {errorMessage ? (
          <p
            role="alert"
            className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  if (workout?.completed_at) {
    return (
      <div className="space-y-5">
        <WaterTracker waterMl={optimisticWaterMl} onAdd={handleAddWater} />
        <WorkoutCompleteSummary
          programLabel={initialData.programLabel}
          completedAt={workout.completed_at}
          exercises={initialData.exercises}
          setsByExercise={setsByExercise}
          notesByExercise={notesByExercise}
        />
        {errorMessage ? (
          <p
            role="alert"
            className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WaterTracker waterMl={optimisticWaterMl} onAdd={handleAddWater} />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Today&apos;s session
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-50">
          {initialData.programLabel ?? "Workout"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {exerciseCount} exercises · {totalSets} sets logged
        </p>
      </section>

      {initialData.exercises.map((exercise) => (
        <ExerciseBlock
          key={exercise.id}
          exercise={exercise}
          sets={setsByExercise[exercise.id] ?? []}
          disabled={!canLogSets || isFinishing}
          previousSession={
            initialData.previousSessionsByExercise[exercise.id] ?? null
          }
          onChangeSet={(localId, next) =>
            handleChangeSet(exercise.id, localId, next)
          }
          onDeleteSet={(localId) => handleDeleteSet(exercise.id, localId)}
          onAddSet={() => handleAddSet(exercise.id)}
          onRestElapsedChange={handleRestElapsedChange}
          previousNote={initialData.previousNotesByExercise[exercise.id] ?? null}
          noteValue={notesByExercise[exercise.id] ?? ""}
          onNoteChange={(value) => handleChangeNote(exercise.id, value)}
          noteSaving={Boolean(noteSavingByExercise[exercise.id])}
          noteJustSaved={Boolean(noteJustSavedByExercise[exercise.id])}
        />
      ))}

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {errorMessage}
        </p>
      ) : null}

      <Button
        fullWidth
        disabled={!canLogSets || isFinishing || totalSets === 0}
        onClick={handleFinishWorkout}
      >
        {isFinishing ? "Finishing…" : "Finish Workout"}
      </Button>

      {canLogSets && totalSets === 0 ? (
        <p className="text-center text-xs text-zinc-500">
          Log at least one set before finishing.
        </p>
      ) : null}
    </div>
  );
}
