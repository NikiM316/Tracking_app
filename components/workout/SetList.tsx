"use client";

import { Button } from "@/components/ui/Button";
import { SetRow, type LocalSet } from "@/components/workout/SetRow";

type SetListProps = {
  sets: LocalSet[];
  disabled?: boolean;
  onChangeSet: (localId: string, next: LocalSet) => void;
  onDeleteSet: (localId: string) => void;
  onAddSet: () => void;
};

export function SetList({
  sets,
  disabled = false,
  onChangeSet,
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
            disabled={disabled}
            onChange={(next) => onChangeSet(set.localId, next)}
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
