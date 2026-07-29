"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { ExerciseBlock } from "@/components/workout/ExerciseBlock";
import type { LocalSet } from "@/components/workout/SetRow";
import {
  deleteSet,
  upsertSet,
  upsertWorkout,
  type TodayWorkoutData,
} from "@/lib/actions/workout";
import type { Set as DbSet } from "@/lib/supabase/types";

type WorkoutFormProps = {
  initialData: TodayWorkoutData;
};

function createLocalId() {
  return `local-${crypto.randomUUID()}`;
}

function toLocalSet(set: DbSet): LocalSet {
  return {
    localId: set.id,
    id: set.id,
    set_category: set.set_category,
    weight: set.weight,
    reps: set.reps,
    set_order: set.set_order,
    dirty: false,
    saving: false,
  };
}

function createEmptySet(setOrder: number): LocalSet {
  return {
    localId: createLocalId(),
    set_category: "top_set",
    weight: null,
    reps: 5,
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreparingWorkout, setIsPreparingWorkout] = useState(
    !initialData.workout && initialData.exercises.length > 0,
  );
  const [isPending, startTransition] = useTransition();

  const canLogSets = Boolean(workout?.id);

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

  function updateExerciseSets(
    exerciseId: string,
    updater: (sets: LocalSet[]) => LocalSet[],
  ) {
    setSetsByExercise((current) => ({
      ...current,
      [exerciseId]: updater(current[exerciseId] ?? []),
    }));
  }

  function handleAddSet(exerciseId: string) {
    updateExerciseSets(exerciseId, (sets) => [
      ...sets,
      createEmptySet(sets.length + 1),
    ]);
  }

  function handleChangeSet(exerciseId: string, localId: string, next: LocalSet) {
    updateExerciseSets(exerciseId, (sets) =>
      sets.map((set) => (set.localId === localId ? next : set)),
    );
  }

  function handleSaveSet(exerciseId: string, localId: string) {
    if (!workout?.id) {
      setErrorMessage("Today's workout is still being prepared. Try again in a moment.");
      return;
    }

    const target = (setsByExercise[exerciseId] ?? []).find(
      (set) => set.localId === localId,
    );

    if (!target) return;

    if (target.reps < 1) {
      setErrorMessage("Reps must be at least 1.");
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    updateExerciseSets(exerciseId, (sets) =>
      sets.map((set) =>
        set.localId === localId ? { ...set, saving: true } : set,
      ),
    );

    startTransition(async () => {
      const result = await upsertSet({
        id: target.id,
        workoutId: workout.id,
        exerciseId,
        setCategory: target.set_category,
        weight:
          initialData.exercises.find((exercise) => exercise.id === exerciseId)
            ?.category === "calisthenics"
            ? null
            : target.weight,
        reps: target.reps,
        setOrder: target.set_order,
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

      updateExerciseSets(exerciseId, (sets) =>
        sets.map((set) =>
          set.localId === localId
            ? { ...toLocalSet(result.set), localId: result.set.id }
            : set,
        ),
      );
      setStatusMessage("Set saved.");
    });
  }

  function handleDeleteSet(exerciseId: string, localId: string) {
    const target = (setsByExercise[exerciseId] ?? []).find(
      (set) => set.localId === localId,
    );

    if (!target) return;

    setErrorMessage(null);
    setStatusMessage(null);

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

    startTransition(async () => {
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
      setStatusMessage("Set deleted.");
    });
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
          disabled={!canLogSets || isPending}
          onChangeSet={(localId, next) =>
            handleChangeSet(exercise.id, localId, next)
          }
          onSaveSet={(localId) => handleSaveSet(exercise.id, localId)}
          onDeleteSet={(localId) => handleDeleteSet(exercise.id, localId)}
          onAddSet={() => handleAddSet(exercise.id)}
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

      {statusMessage ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
