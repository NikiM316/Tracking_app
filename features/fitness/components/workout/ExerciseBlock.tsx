"use client";

import { ExerciseNotesInput } from "@/features/fitness/components/workout/ExerciseNotesInput";
import { PreviousSessionGhost } from "@/features/fitness/components/workout/PreviousSessionGhost";
import { SetList } from "@/features/fitness/components/workout/SetList";
import type { LocalSet } from "@/features/fitness/components/workout/SetRow";
import type { PreviousExerciseSession } from "@/features/fitness/actions/workout";
import type { Exercise } from "@/lib/supabase/types";

type ExerciseBlockProps = {
  exercise: Exercise;
  sets: LocalSet[];
  disabled?: boolean;
  previousSession?: PreviousExerciseSession | null;
  onChangeSet: (localId: string, next: LocalSet) => void;
  onDeleteSet: (localId: string) => void;
  onAddSet: () => void;
  onRestElapsedChange: (precedingSetLocalId: string, seconds: number) => void;
  previousNote: string | null;
  noteValue: string;
  onNoteChange: (value: string) => void;
  noteSaving?: boolean;
  noteJustSaved?: boolean;
};

const categoryLabel: Record<Exercise["category"], string> = {
  barbell: "Barbell",
  calisthenics: "Calisthenics",
  cardio: "Cardio",
  mobility: "Mobility",
};

export function ExerciseBlock({
  exercise,
  sets,
  disabled = false,
  previousSession = null,
  onChangeSet,
  onDeleteSet,
  onAddSet,
  onRestElapsedChange,
  previousNote,
  noteValue,
  onNoteChange,
  noteSaving = false,
  noteJustSaved = false,
}: ExerciseBlockProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50">{exercise.name}</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Log sets with category, weight (kg), and reps.
          </p>
        </div>
        <span className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          {categoryLabel[exercise.category]}
        </span>
      </div>

      <PreviousSessionGhost session={previousSession} />

      <SetList
        sets={sets}
        disabled={disabled}
        onChangeSet={onChangeSet}
        onDeleteSet={onDeleteSet}
        onAddSet={onAddSet}
        onRestElapsedChange={onRestElapsedChange}
      />

      <div className="mt-4">
        <ExerciseNotesInput
          previousNote={previousNote}
          value={noteValue}
          onChange={onNoteChange}
          disabled={disabled}
          saving={noteSaving}
          justSaved={noteJustSaved}
        />
      </div>
    </section>
  );
}
