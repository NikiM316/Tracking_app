"use client";

import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";
import { SetCategoryPicker } from "@/components/workout/SetCategoryPicker";
import type { ExerciseCategory, SetCategory } from "@/lib/supabase/types";

export type LocalSet = {
  localId: string;
  id?: string;
  set_category: SetCategory;
  weight: number | null;
  reps: number;
  rpe: number | null;
  set_order: number;
  dirty?: boolean;
  saving?: boolean;
};

type SetRowProps = {
  set: LocalSet;
  index: number;
  category: ExerciseCategory;
  disabled?: boolean;
  onChange: (next: LocalSet) => void;
  onSave: () => void;
  onDelete: () => void;
};

export function SetRow({
  set,
  index,
  category,
  disabled = false,
  onChange,
  onSave,
  onDelete,
}: SetRowProps) {
  const isCalisthenics = category === "calisthenics";
  const isBusy = Boolean(set.saving) || disabled;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-200">Set {index + 1}</p>
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
        onChange={(set_category) =>
          onChange({ ...set, set_category, dirty: true })
        }
      />

      <div className={`grid gap-3 ${isCalisthenics ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
        {!isCalisthenics ? (
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
          />
        ) : null}

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
        />

        <NumberInput
          label="RPE"
          value={set.rpe}
          min={1}
          max={10}
          step={0.5}
          allowNull
          disabled={isBusy}
          onChange={(rpe) => onChange({ ...set, rpe, dirty: true })}
        />
      </div>

      {isCalisthenics ? (
        <p className="text-xs text-zinc-500">Bodyweight movement — weight omitted.</p>
      ) : null}

      <Button
        variant="secondary"
        fullWidth
        disabled={isBusy || !set.dirty}
        onClick={onSave}
      >
        {set.saving ? "Saving…" : set.id ? "Update set" : "Save set"}
      </Button>
    </div>
  );
}
