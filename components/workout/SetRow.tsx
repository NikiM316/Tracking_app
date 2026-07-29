"use client";

import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";
import { SetCategoryPicker } from "@/components/workout/SetCategoryPicker";
import type { SetCategory } from "@/lib/supabase/types";

export type LocalSet = {
  localId: string;
  id?: string;
  set_category: SetCategory;
  weight: number | null;
  reps: number;
  set_order: number;
  dirty?: boolean;
  saving?: boolean;
};

type SetRowProps = {
  set: LocalSet;
  index: number;
  disabled?: boolean;
  onChange: (next: LocalSet) => void;
  onSave: (setToSave: LocalSet) => void;
  onDelete: () => void;
};

export function SetRow({
  set,
  index,
  disabled = false,
  onChange,
  onSave,
  onDelete,
}: SetRowProps) {
  const isBusy = Boolean(set.saving) || disabled;

  function handleCategoryChange(set_category: SetCategory) {
    const next = { ...set, set_category, dirty: true };
    onChange(next);
    onSave(next);
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-200">Set {index + 1}</p>
          {set.saving ? (
            <span className="text-xs text-emerald-400">Saving…</span>
          ) : set.id ? (
            <span className="text-xs text-zinc-500">Saved</span>
          ) : null}
        </div>
        <Button
          variant="ghost"
          className="min-h-10 px-2 text-red-300"
          disabled={isBusy}
          onClick={onDelete}
          aria-label={`Delete set ${index + 1}`}
        >
          Delete
        </Button>
      </div>

      <SetCategoryPicker
        value={set.set_category}
        disabled={isBusy}
        onChange={handleCategoryChange}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="Weight"
          unit="kg"
          value={set.weight}
          min={0}
          max={500}
          step={2.5}
          allowNull
          disabled={isBusy}
          onChange={(weight) => onChange({ ...set, weight, dirty: true })}
          onCommit={(weight) => onSave({ ...set, weight, dirty: true })}
        />

        <NumberInput
          label="Reps"
          value={set.reps}
          min={1}
          max={100}
          step={1}
          disabled={isBusy}
          onChange={(reps) =>
            onChange({ ...set, reps: reps ?? 1, dirty: true })
          }
          onCommit={(reps) =>
            onSave({ ...set, reps: reps ?? set.reps, dirty: true })
          }
        />
      </div>
    </div>
  );
}
