"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";

import { incrementWaterMl } from "@/features/fitness/actions/workout";
import type { Workout } from "@/lib/supabase/types";

type UseWorkoutWaterOptions = {
  initialWaterMl: number;
  setWorkout: (workout: Workout) => void;
  setErrorMessage: (value: string | null) => void;
};

export function useWorkoutWater({
  initialWaterMl,
  setWorkout,
  setErrorMessage,
}: UseWorkoutWaterOptions) {
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const [optimisticWaterMl, addOptimisticWater] = useOptimistic(
    waterMl,
    (current, amountMl: number) => current + amountMl,
  );
  const [, startWaterTransition] = useTransition();
  const pendingWaterMlRef = useRef(0);
  const confirmedWaterMlRef = useRef(initialWaterMl);

  function syncFromWorkout(workout: Workout) {
    setWaterMl(workout.water_ml);
    confirmedWaterMlRef.current = workout.water_ml;
  }

  function handleAddWater(amountMl: number) {
    if (!Number.isFinite(amountMl) || amountMl <= 0) return;

    setErrorMessage(null);
    pendingWaterMlRef.current += amountMl;

    startWaterTransition(async () => {
      addOptimisticWater(amountMl);
      try {
        const result = await incrementWaterMl(amountMl);

        if (result.error || result.workout == null || result.waterMl == null) {
          setErrorMessage(result.error ?? "Failed to update water intake.");
          return;
        }

        confirmedWaterMlRef.current = Math.max(
          confirmedWaterMlRef.current,
          result.waterMl,
        );
        const remainingPendingMl = pendingWaterMlRef.current - amountMl;
        const reconciledWaterMl =
          confirmedWaterMlRef.current + remainingPendingMl;

        setWorkout({ ...result.workout, water_ml: reconciledWaterMl });
        if (remainingPendingMl === 0) {
          setWaterMl(confirmedWaterMlRef.current);
        }
      } finally {
        pendingWaterMlRef.current -= amountMl;
      }
    });
  }

  return {
    optimisticWaterMl,
    handleAddWater,
    syncFromWorkout,
  };
}
