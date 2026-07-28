"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";

type CnsReadinessInputProps = {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  locked?: boolean;
};

const CNS_OPTIONS = Array.from({ length: 10 }, (_, index) => {
  const value = index + 1;
  return { value, label: String(value) };
});

export function CnsReadinessInput({
  value,
  onChange,
  disabled = false,
  locked = false,
}: CnsReadinessInputProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">CNS Readiness</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Rate how recovered your nervous system feels today (1–10).
          </p>
        </div>
        {locked ? (
          <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            Locked
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <SegmentedControl
          ariaLabel="CNS readiness score"
          options={CNS_OPTIONS}
          value={value}
          onChange={onChange}
          disabled={disabled || locked}
        />
      </div>

      {value !== null ? (
        <p className="mt-3 text-sm text-zinc-300">
          Selected: <span className="font-semibold text-emerald-300">{value}/10</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          Complete readiness before logging sets.
        </p>
      )}
    </section>
  );
}
