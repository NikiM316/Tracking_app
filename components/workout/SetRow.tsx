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
  justSaved?: boolean;
};

type SetRowProps = {
  set: LocalSet;
  index: number;
  disabled?: boolean;
  onChange: (next: LocalSet) => void;
  onDelete: () => void;
};

export function SetRow({
  set,
  index,
  disabled = false,
  onChange,
  onDelete,
}: SetRowProps) {
  const isBusy = Boolean(set.saving) || disabled;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-200">Set {index + 1}</p>
          {set.saving ? (
            <span className="text-xs font-medium text-emerald-400">Saving…</span>
          ) : (
            <span
              aria-hidden={!set.justSaved}
              className={`flex items-center gap-1 text-xs font-medium text-emerald-400 transition-opacity duration-700 ${
                set.justSaved ? "opacity-100" : "opacity-0"
              }`}
            >
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
          )}
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
        onChange={(set_category: SetCategory) =>
          onChange({ ...set, set_category, dirty: true })
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
