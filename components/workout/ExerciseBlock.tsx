"use client";

import { SetList } from "@/components/workout/SetList";
import type { LocalSet } from "@/components/workout/SetRow";
import type { Exercise } from "@/lib/supabase/types";

type ExerciseBlockProps = {
  exercise: Exercise;
  sets: LocalSet[];
  disabled?: boolean;
  onChangeSet: (localId: string, next: LocalSet) => void;
  onSaveSet: (localId: string) => void;
  onDeleteSet: (localId: string) => void;
  onAddSet: () => void;
};

const categoryLabel: Record<Exercise["category"], string> = {
  barbell: "Barbell",
  calisthenics: "Calisthenics",
  cardio: "Cardio",
};

export function ExerciseBlock({
  exercise,
  sets,
  disabled = false,
  onChangeSet,
  onSaveSet,
  onDeleteSet,
  onAddSet,
}: ExerciseBlockProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50">{exercise.name}</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Log sets with category and reps
            {exercise.category === "barbell" ? ", plus weight in kg" : ""}.
          </p>
        </div>
        <span className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          {categoryLabel[exercise.category]}
        </span>
      </div>

      <SetList
        sets={sets}
        category={exercise.category}
        disabled={disabled}
        onChangeSet={onChangeSet}
        onSaveSet={onSaveSet}
        onDeleteSet={onDeleteSet}
        onAddSet={onAddSet}
      />
    </section>
  );
}
