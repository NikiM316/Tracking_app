"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { clearRestTimerStorage } from "@/features/fitness/components/workout/RestTimer";
import type { LocalSet } from "@/features/fitness/components/workout/SetRow";
import {
  deleteSet,
  upsertSet,
  type TodayWorkoutData,
} from "@/features/fitness/actions/workout";

import {
  createEmptySet,
  getRestSecondsForSet,
  groupSetsByExercise,
  insertSmartWarmups,
  SAVE_DEBOUNCE_MS,
  SAVE_FLASH_MS,
  supportsSmartWarmups,
  toLocalSet,
} from "./workout-form-shared";

type UseWorkoutSetsOptions = {
  exercises: TodayWorkoutData["exercises"];
  initialSets: TodayWorkoutData["sets"];
  previousTopSetByExercise: TodayWorkoutData["previousTopSetByExercise"];
  workoutId: string | null | undefined;
  setErrorMessage: (value: string | null) => void;
};

export function useWorkoutSets({
  exercises,
  initialSets,
  previousTopSetByExercise,
  workoutId,
  setErrorMessage,
}: UseWorkoutSetsOptions) {
  const [setsByExercise, setSetsByExercise] = useState(() =>
    groupSetsByExercise(exercises, initialSets),
  );

  const setSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const setFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSetSaves = useRef<Record<string, { exerciseId: string; set: LocalSet }>>({});
  const workoutIdRef = useRef<string | null>(workoutId ?? null);
  const restElapsedByPrecedingSetRef = useRef<Record<string, number>>({});
  const setsByExerciseRef = useRef(setsByExercise);
  const inFlightWritesRef = useRef(new Set<Promise<void>>());
  const writeChainByLocalIdRef = useRef<Record<string, Promise<void>>>({});
  const handleSaveSetRef = useRef<
    (exerciseId: string, localId: string, target: LocalSet) => void
  >(() => {});

  const totalSets = useMemo(
    () => Object.values(setsByExercise).reduce((sum, sets) => sum + sets.length, 0),
    [setsByExercise],
  );

  useEffect(() => {
    workoutIdRef.current = workoutId ?? null;
  }, [workoutId]);

  useEffect(() => {
    setsByExerciseRef.current = setsByExercise;
  }, [setsByExercise]);

  useEffect(() => {
    const setSaveTimersMap = setSaveTimers.current;
    const setFlashTimersMap = setFlashTimers.current;
    const pendingSetSavesMap = pendingSetSaves.current;
    const restElapsedByPrecedingSet = restElapsedByPrecedingSetRef.current;

    return () => {
      for (const timer of Object.values(setSaveTimersMap)) clearTimeout(timer);
      for (const timer of Object.values(setFlashTimersMap)) clearTimeout(timer);

      const pendingWorkoutId = workoutIdRef.current;
      const pending = Object.values(pendingSetSavesMap);
      const flushable = pending.filter(
        (entry) => entry.set.reps != null && entry.set.reps >= 1,
      );

      if (pendingWorkoutId) {
        for (const { exerciseId, set } of flushable) {
          const exerciseSets = setsByExerciseRef.current[exerciseId] ?? [];
          const restSeconds = getRestSecondsForSet(
            exerciseSets,
            set.localId,
            restElapsedByPrecedingSet,
            set.restSeconds,
          );

          const liveSet = exerciseSets.find((item) => item.localId === set.localId);

          void upsertSet({
            id: liveSet?.id ?? set.id,
            workoutId: pendingWorkoutId,
            exerciseId,
            setCategory: set.set_category,
            weight: set.weight,
            reps: set.reps!,
            setOrder: liveSet?.set_order ?? set.set_order,
            restSeconds,
          });
        }
      }

      pendingSetSaves.current = {};
    };
  }, []);

  function updateExerciseSets(
    exerciseId: string,
    updater: (sets: LocalSet[]) => LocalSet[],
  ) {
    const next = {
      ...setsByExerciseRef.current,
      [exerciseId]: updater(setsByExerciseRef.current[exerciseId] ?? []),
    };
    setsByExerciseRef.current = next;
    setSetsByExercise(next);
  }

  function trackWrite(write: Promise<void>) {
    inFlightWritesRef.current.add(write);
    void write.finally(() => {
      inFlightWritesRef.current.delete(write);
    });
    return write;
  }

  function enqueueWrite(localId: string, write: () => Promise<void>) {
    const previous = writeChainByLocalIdRef.current[localId] ?? Promise.resolve();
    const next = previous.then(write, write);
    writeChainByLocalIdRef.current[localId] = next;
    trackWrite(next);
    void next.finally(() => {
      if (writeChainByLocalIdRef.current[localId] === next) {
        delete writeChainByLocalIdRef.current[localId];
      }
    });
    return next;
  }

  function scheduleSetSave(exerciseId: string, localId: string, next: LocalSet) {
    pendingSetSaves.current[localId] = { exerciseId, set: next };

    if (setSaveTimers.current[localId]) {
      clearTimeout(setSaveTimers.current[localId]);
    }
    setSaveTimers.current[localId] = setTimeout(() => {
      delete setSaveTimers.current[localId];
      delete pendingSetSaves.current[localId];
      handleSaveSetRef.current(exerciseId, localId, next);
    }, SAVE_DEBOUNCE_MS);
  }

  function handleAddSet(exerciseId: string) {
    const currentSets = setsByExerciseRef.current[exerciseId] ?? [];
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
    const exercise = exercises.find((item) => item.id === exerciseId);
    if (!exercise || !supportsSmartWarmups(exercise)) return;

    try {
      // Use server-prefetched previous top set so we don't call a Server Action
      // from the client (which would refresh the route and remount the form).
      const previousTop = previousTopSetByExercise[exerciseId] ?? null;

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
    const exercise = exercises.find((item) => item.id === exerciseId);
    const currentSets = setsByExerciseRef.current[exerciseId] ?? [];
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
      set.localId === localId
        ? { ...nextSet, id: set.id ?? nextSet.id }
        : set,
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
    if (reps == null || reps < 1) {
      return;
    }
    if (!workoutIdRef.current) {
      return;
    }

    setErrorMessage(null);

    updateExerciseSets(exerciseId, (sets) =>
      sets.map((set) =>
        set.localId === localId
          ? {
              ...target,
              id: set.id ?? target.id,
              saving: true,
              justSaved: false,
            }
          : set,
      ),
    );

    return enqueueWrite(localId, async () => {
      const workoutId = workoutIdRef.current;
      if (!workoutId) return;

      const exerciseSets = setsByExerciseRef.current[exerciseId] ?? [];
      const liveSet = exerciseSets.find((set) => set.localId === localId);
      if (!liveSet) return;

      const restSeconds = getRestSecondsForSet(
        exerciseSets,
        localId,
        restElapsedByPrecedingSetRef.current,
        liveSet.restSeconds ?? target.restSeconds,
      );

      try {
        const result = await upsertSet({
          id: liveSet.id,
          workoutId,
          exerciseId,
          setCategory: target.set_category,
          weight: target.weight,
          reps,
          setOrder: liveSet.set_order,
          restSeconds,
        });

        if (result.error || !result.set) {
          setErrorMessage(result.error ?? "Failed to save set.");
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
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to save set.",
        );
      } finally {
        updateExerciseSets(exerciseId, (sets) =>
          sets.map((set) =>
            set.localId === localId ? { ...set, saving: false } : set,
          ),
        );
      }
    });
  }

  handleSaveSetRef.current = handleSaveSet;

  function handleDeleteSet(exerciseId: string, localId: string) {
    const target = (setsByExerciseRef.current[exerciseId] ?? []).find(
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

    void enqueueWrite(localId, async () => {
      try {
        const liveSet = (setsByExerciseRef.current[exerciseId] ?? []).find(
          (set) => set.localId === localId,
        );
        const setId = liveSet?.id ?? target.id;
        if (!setId) return;

        const result = await deleteSet(setId);

        if (!result.success) {
          setErrorMessage(result.error);
          return;
        }

        updateExerciseSets(exerciseId, (sets) =>
          sets
            .filter((set) => set.localId !== localId)
            .map((set, index) => ({ ...set, set_order: index + 1 })),
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to delete set.",
        );
      } finally {
        updateExerciseSets(exerciseId, (sets) =>
          sets.map((set) =>
            set.localId === localId ? { ...set, saving: false } : set,
          ),
        );
      }
    });
  }

  async function flush() {
    const pending = Object.values(pendingSetSaves.current);
    for (const timer of Object.values(setSaveTimers.current)) {
      clearTimeout(timer);
    }
    setSaveTimers.current = {};
    pendingSetSaves.current = {};

    for (const { exerciseId, set } of pending) {
      handleSaveSet(exerciseId, set.localId, set);
    }

    await Promise.all([...inFlightWritesRef.current]);
  }

  return {
    setsByExercise,
    totalSets,
    handleAddSet,
    handleChangeSet,
    handleDeleteSet,
    handleRestElapsedChange,
    flush,
  };
}
