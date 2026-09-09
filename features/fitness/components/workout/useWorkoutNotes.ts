"use client";

import { useEffect, useRef, useState } from "react";

import {
  upsertExerciseNote,
  type TodayWorkoutData,
} from "@/features/fitness/actions/workout";

import { SAVE_DEBOUNCE_MS, SAVE_FLASH_MS } from "./workout-form-shared";

type UseWorkoutNotesOptions = {
  exercises: TodayWorkoutData["exercises"];
  todayNotesByExercise: TodayWorkoutData["todayNotesByExercise"];
  workoutId: string | null | undefined;
  setErrorMessage: (value: string | null) => void;
};

export function useWorkoutNotes({
  exercises,
  todayNotesByExercise,
  workoutId,
  setErrorMessage,
}: UseWorkoutNotesOptions) {
  const [notesByExercise, setNotesByExercise] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      for (const exercise of exercises) {
        initial[exercise.id] = todayNotesByExercise[exercise.id] ?? "";
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

  const noteSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const noteFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingNoteSaves = useRef<Record<string, string>>({});
  const workoutIdRef = useRef<string | null>(workoutId ?? null);

  useEffect(() => {
    workoutIdRef.current = workoutId ?? null;
  }, [workoutId]);

  useEffect(() => {
    const noteSaveTimersMap = noteSaveTimers.current;
    const noteFlashTimersMap = noteFlashTimers.current;
    const pendingNoteSavesMap = pendingNoteSaves.current;

    return () => {
      for (const timer of Object.values(noteSaveTimersMap)) clearTimeout(timer);
      for (const timer of Object.values(noteFlashTimersMap)) clearTimeout(timer);

      const pendingWorkoutId = workoutIdRef.current;
      if (pendingWorkoutId) {
        for (const [exerciseId, note] of Object.entries(pendingNoteSavesMap)) {
          void upsertExerciseNote({
            workoutId: pendingWorkoutId,
            exerciseId,
            note,
          });
        }
      }

      pendingNoteSaves.current = {};
    };
  }, []);

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
    if (!workoutId) return;

    setErrorMessage(null);
    setNoteSavingByExercise((current) => ({ ...current, [exerciseId]: true }));
    setNoteJustSavedByExercise((current) => ({ ...current, [exerciseId]: false }));

    (async () => {
      try {
        const result = await upsertExerciseNote({
          workoutId,
          exerciseId,
          note,
        });

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
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to save note.",
        );
      } finally {
        setNoteSavingByExercise((current) => ({ ...current, [exerciseId]: false }));
      }
    })();
  }

  return {
    notesByExercise,
    noteSavingByExercise,
    noteJustSavedByExercise,
    handleChangeNote,
  };
}
