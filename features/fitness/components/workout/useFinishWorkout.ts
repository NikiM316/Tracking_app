"use client";

import { useState } from "react";

import { finishWorkout } from "@/features/fitness/actions/workout";
import type { Workout } from "@/lib/supabase/types";

type UseFinishWorkoutOptions = {
  workoutId: string | null | undefined;
  setWorkout: (workout: Workout) => void;
  syncWaterFromWorkout: (workout: Workout) => void;
  setErrorMessage: (value: string | null) => void;
};

export function useFinishWorkout({
  workoutId,
  setWorkout,
  syncWaterFromWorkout,
  setErrorMessage,
}: UseFinishWorkoutOptions) {
  const [isFinishing, setIsFinishing] = useState(false);

  function handleFinishWorkout() {
    if (!workoutId) return;

    setErrorMessage(null);
    setIsFinishing(true);

    (async () => {
      const result = await finishWorkout(workoutId);
      setIsFinishing(false);

      if (result.error || !result.workout) {
        setErrorMessage(result.error ?? "Failed to finish workout.");
        return;
      }

      setWorkout(result.workout);
      syncWaterFromWorkout(result.workout);
    })();
  }

  return {
    isFinishing,
    handleFinishWorkout,
  };
}
