"use client";

import { useState } from "react";

import { WaterTracker } from "@/features/fitness/components/workout/WaterTracker";
import type { TodayWorkoutData } from "@/features/fitness/actions/workout";

import { ActiveWorkoutView } from "./ActiveWorkoutView";
import { CompletedWorkoutView } from "./CompletedWorkoutView";
import { FinishWorkoutBar } from "./FinishWorkoutBar";
import { RestDayView } from "./RestDayView";
import { useFinishWorkout } from "./useFinishWorkout";
import { useWorkoutNotes } from "./useWorkoutNotes";
import { useWorkoutSets } from "./useWorkoutSets";
import { useWorkoutWater } from "./useWorkoutWater";

type WorkoutFormProps = {
  initialData: TodayWorkoutData;
};

function WorkoutErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
    >
      {message}
    </p>
  );
}

export function WorkoutForm({ initialData }: WorkoutFormProps) {
  const [workout, setWorkout] = useState(initialData.workout);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const water = useWorkoutWater({
    initialWaterMl: initialData.workout?.water_ml ?? 0,
    setWorkout,
    setErrorMessage,
  });
  const sets = useWorkoutSets({
    exercises: initialData.exercises,
    initialSets: initialData.sets,
    previousTopSetByExercise: initialData.previousTopSetByExercise,
    workoutId: workout?.id,
    setErrorMessage,
  });
  const notes = useWorkoutNotes({
    exercises: initialData.exercises,
    todayNotesByExercise: initialData.todayNotesByExercise,
    workoutId: workout?.id,
    setErrorMessage,
  });
  const { isFinishing, handleFinishWorkout } = useFinishWorkout({
    workoutId: workout?.id,
    setWorkout,
    syncWaterFromWorkout: water.syncFromWorkout,
    setErrorMessage,
  });

  const canLogSets = Boolean(workout?.id);
  const isRestDay = initialData.exercises.length === 0;
  const isCompleted = Boolean(workout?.completed_at);

  return (
    <div className="space-y-5">
      <WaterTracker waterMl={water.optimisticWaterMl} onAdd={water.handleAddWater} />

      {isRestDay ? (
        <RestDayView cycleDay={initialData.cycleDay} />
      ) : isCompleted && workout?.completed_at ? (
        <CompletedWorkoutView
          programLabel={initialData.programLabel}
          completedAt={workout.completed_at}
          exercises={initialData.exercises}
          setsByExercise={sets.setsByExercise}
          notesByExercise={notes.notesByExercise}
        />
      ) : (
        <ActiveWorkoutView
          initialData={initialData}
          setsByExercise={sets.setsByExercise}
          notesByExercise={notes.notesByExercise}
          noteSavingByExercise={notes.noteSavingByExercise}
          noteJustSavedByExercise={notes.noteJustSavedByExercise}
          totalSets={sets.totalSets}
          disabled={!canLogSets || isFinishing}
          onChangeSet={sets.handleChangeSet}
          onDeleteSet={sets.handleDeleteSet}
          onAddSet={sets.handleAddSet}
          onRestElapsedChange={sets.handleRestElapsedChange}
          onNoteChange={notes.handleChangeNote}
        />
      )}

      <WorkoutErrorAlert message={errorMessage} />

      {!isRestDay && !isCompleted ? (
        <FinishWorkoutBar
          canLogSets={canLogSets}
          isFinishing={isFinishing}
          totalSets={sets.totalSets}
          onFinish={handleFinishWorkout}
        />
      ) : null}
    </div>
  );
}
