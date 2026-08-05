"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ExerciseBlock } from "@/components/workout/ExerciseBlock";
import type { LocalSet } from "@/components/workout/SetRow";
import { WorkoutCompleteSummary } from "@/components/workout/WorkoutCompleteSummary";
import {
  deleteSet,
  finishWorkout,
  upsertExerciseNote,
  upsertSet,
  upsertWorkout,
  type TodayWorkoutData,
} from "@/lib/actions/workout";
import type { Set as DbSet } from "@/lib/supabase/types";

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
  const [isPreparingWorkout, setIsPreparingWorkout] = useState(
    !initialData.workout && initialData.exercises.length > 0,
  );
  const [isFinishing, setIsFinishing] = useState(false);

  const setSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const noteSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const setFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const noteFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSetSaves = useRef<Record<string, { exerciseId: string; set: LocalSet }>>({});
  const pendingNoteSaves = useRef<Record<string, string>>({});
  const workoutIdRef = useRef<string | null>(initialData.workout?.id ?? null);
  const restElapsedByPrecedingSetRef = useRef<Record<string, number>>({});

  const canLogSets = Boolean(workout?.id);
  const isCompleted = Boolean(workout?.completed_at);

  const exerciseCount = initialData.exercises.length;
  const totalSets = useMemo(
    () => Object.values(setsByExercise).reduce((sum, sets) => sum + sets.length, 0),
    [setsByExercise],
  );

  useEffect(() => {
    if (workout || initialData.exercises.length === 0) {
      return;
    }

    let cancelled = false;
    setIsPreparingWorkout(true);

    (async () => {
      const result = await upsertWorkout({ cycleDay: initialData.cycleDay });

      if (cancelled) return;

      if (result.error || !result.workout) {
        setErrorMessage(result.error ?? "Failed to start today's workout.");
        setIsPreparingWorkout(false);
        return;
      }

      setWorkout(result.workout);
      setIsPreparingWorkout(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    workoutIdRef.current = workout?.id ?? null;
  }, [workout?.id]);

  // Flush any pending debounced saves to the server if the component unmounts
  // (e.g. navigating to another tab) before the debounce timer fires, so
  // in-progress edits are never silently lost.
  useEffect(() => {
    return () => {
      for (const timer of Object.values(setSaveTimers.current)) clearTimeout(timer);
      for (const timer of Object.values(noteSaveTimers.current)) clearTimeout(timer);
      for (const timer of Object.values(setFlashTimers.current)) clearTimeout(timer);
      for (const timer of Object.values(noteFlashTimers.current)) clearTimeout(timer);

      const workoutId = workoutIdRef.current;

      if (workoutId) {
        for (const { exerciseId, set } of Object.values(pendingSetSaves.current)) {
          if (set.reps != null && set.reps >= 1) {
            const exerciseSets = setsByExercise[exerciseId] ?? [];
            const restSeconds = getRestSecondsForSet(
              exerciseSets,
              set.localId,
              restElapsedByPrecedingSetRef.current,
              set.restSeconds,
            );

            void upsertSet({
              id: set.id,
              workoutId,
              exerciseId,
              setCategory: set.set_category,
              weight: set.weight,
              reps: set.reps,
              setOrder: set.set_order,
              restSeconds,
            });
          }
        }

        for (const [exerciseId, note] of Object.entries(pendingNoteSaves.current)) {
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

  function handleChangeSet(exerciseId: string, localId: string, next: LocalSet) {
    updateExerciseSets(exerciseId, (sets) =>
      sets.map((set) => (set.localId === localId ? next : set)),
    );
    scheduleSetSave(exerciseId, localId, next);
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

      const savedLocalId = result.set.id;

      updateExerciseSets(exerciseId, (sets) =>
        sets.map((set) =>
          set.localId === localId
            ? { ...toLocalSet(result.set), localId: savedLocalId, justSaved: true }
            : set,
        ),
      );

      if (setFlashTimers.current[savedLocalId]) {
        clearTimeout(setFlashTimers.current[savedLocalId]);
      }
      setFlashTimers.current[savedLocalId] = setTimeout(() => {
        delete setFlashTimers.current[savedLocalId];
        updateExerciseSets(exerciseId, (sets) =>
          sets.map((set) =>
            set.localId === savedLocalId ? { ...set, justSaved: false } : set,
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
    })();
  }

  if (initialData.exercises.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Rest / unprogrammed day</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Day {initialData.cycleDay} is not in the program yet. Days 3–14 will be
          added later.
        </p>
      </section>
    );
  }

  if (workout?.completed_at) {
    return (
      <WorkoutCompleteSummary
        programLabel={initialData.programLabel}
        completedAt={workout.completed_at}
        exercises={initialData.exercises}
        setsByExercise={setsByExercise}
        notesByExercise={notesByExercise}
      />
    );
  }

  return (
    <div className="space-y-5">
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

      {isPreparingWorkout ? (
        <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-4 py-3 text-center text-sm text-zinc-500">
          Preparing today&apos;s workout…
        </p>
      ) : null}

      {initialData.exercises.map((exercise) => (
        <ExerciseBlock
          key={exercise.id}
          exercise={exercise}
          sets={setsByExercise[exercise.id] ?? []}
          disabled={!canLogSets || isFinishing}
          currentWorkoutId={workout?.id ?? null}
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
