"use client";

import { Button } from "@/components/ui/Button";
import { SetRow, type LocalSet } from "@/components/workout/SetRow";
import type { ExerciseCategory } from "@/lib/supabase/types";

type SetListProps = {
  sets: LocalSet[];
  category: ExerciseCategory;
  disabled?: boolean;
  onChangeSet: (localId: string, next: LocalSet) => void;
  onSaveSet: (localId: string) => void;
  onDeleteSet: (localId: string) => void;
  onAddSet: () => void;
};

export function SetList({
  sets,
  category,
  disabled = false,
  onChangeSet,
  onSaveSet,
  onDeleteSet,
  onAddSet,
}: SetListProps) {
  return (
    <div className="space-y-3">
      {sets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-6 text-center text-sm text-zinc-500">
          No sets yet. Add your first set below.
        </p>
      ) : (
        sets.map((set, index) => (
          <SetRow
            key={set.localId}
            set={set}
            index={index}
            category={category}
            disabled={disabled}
            onChange={(next) => onChangeSet(set.localId, next)}
            onSave={() => onSaveSet(set.localId)}
            onDelete={() => onDeleteSet(set.localId)}
          />
        ))
      )}

      <Button
        variant="secondary"
        fullWidth
        disabled={disabled}
        onClick={onAddSet}
      >
        Add set
      </Button>
    </div>
  );
}
