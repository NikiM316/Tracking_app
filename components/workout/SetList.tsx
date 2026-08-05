"use client";

import { Button } from "@/components/ui/Button";
import { RestTimer } from "@/components/workout/RestTimer";
import { SetRow, type LocalSet } from "@/components/workout/SetRow";

type SetListProps = {
  sets: LocalSet[];
  disabled?: boolean;
  canGenerateWarmups?: boolean;
  isGeneratingWarmups?: boolean;
  onChangeSet: (localId: string, next: LocalSet) => void;
  onDeleteSet: (localId: string) => void;
  onAddSet: () => void;
  onGenerateWarmups?: () => void;
  onRestElapsedChange: (precedingSetLocalId: string, seconds: number) => void;
};

export function SetList({
  sets,
  disabled = false,
  canGenerateWarmups = false,
  isGeneratingWarmups = false,
  onChangeSet,
  onDeleteSet,
  onAddSet,
  onGenerateWarmups,
  onRestElapsedChange,
}: SetListProps) {
  return (
    <div className="space-y-3">
      {sets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-6 text-center text-sm text-zinc-500">
          No sets yet. Add your first set below.
        </p>
      ) : (
        sets.map((set, index) => (
          <div key={set.localId} className="space-y-2">
            <SetRow
              set={set}
              index={index}
              disabled={disabled}
              onChange={(next) => onChangeSet(set.localId, next)}
              onDelete={() => onDeleteSet(set.localId)}
            />
            <RestTimer
              key={`${set.localId}-${sets[index + 1]?.id ?? "pending"}-${sets[index + 1]?.restSeconds ?? "none"}`}
              disabled={disabled}
              initialSeconds={sets[index + 1]?.restSeconds ?? null}
              onElapsedChange={(seconds) =>
                onRestElapsedChange(set.localId, seconds)
              }
            />
          </div>
        ))
      )}

      {canGenerateWarmups && onGenerateWarmups ? (
        <Button
          variant="secondary"
          fullWidth
          disabled={disabled || isGeneratingWarmups}
          onClick={onGenerateWarmups}
        >
          {isGeneratingWarmups ? "Generating warm-ups…" : "Generate Warm-ups"}
        </Button>
      ) : null}

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
