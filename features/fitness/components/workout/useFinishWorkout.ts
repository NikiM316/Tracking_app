"use client";

import { useState } from "react";

import { finishWorkout } from "@/features/fitness/actions/workout";
import type { Workout } from "@/lib/supabase/types";

type UseFinishWorkoutOptions = {
  workoutId: string | null | undefined;
  setWorkout: (workout: Workout) => void;
  syncWaterFromWorkout: (workout: Workout) => void;
  setErrorMessage: (value: string | null) => void;
  flush: () => Promise<void>;
};

export function useFinishWorkout({
  workoutId,
  setWorkout,
  syncWaterFromWorkout,
  setErrorMessage,
  flush,
}: UseFinishWorkoutOptions) {
  const [isFinishing, setIsFinishing] = useState(false);

  async function handleFinishWorkout() {
    if (!workoutId) return;

    setErrorMessage(null);
    setIsFinishing(true);

    try {
      await flush();
      const result = await finishWorkout(workoutId);

      if (result.error || !result.workout) {
        setErrorMessage(result.error ?? "Failed to finish workout.");
        return;
      }

      setWorkout(result.workout);
      syncWaterFromWorkout(result.workout);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to finish workout.",
      );
    } finally {
      setIsFinishing(false);
    }
  }

  return {
    isFinishing,
    handleFinishWorkout,
  };
}
