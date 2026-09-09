"use client";

import type { ReflectionDraft } from "./checklist-shared";

function ReflectionField({
  label,
  value,
  onChange,
  locked,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  locked: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {locked ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {value.trim() ? value : "—"}
        </p>
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="mt-1 min-h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base leading-relaxed text-zinc-100 outline-none focus:border-emerald-500"
        />
      )}
    </label>
  );
}

type ReflectionSectionProps = {
  locked: boolean;
  values: ReflectionDraft;
  onChange: (field: keyof ReflectionDraft, value: string) => void;
};

export function ReflectionSection({
  locked,
  values,
  onChange,
}: ReflectionSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        End-of-day reflection
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Optional. Does not affect pass or fail.
      </p>
      <div className="mt-4 space-y-4">
        <ReflectionField
          label="What did I accomplish?"
          value={values.accomplished}
          onChange={(value) => onChange("accomplished", value)}
          locked={locked}
        />
        <ReflectionField
          label="What did I fail to do?"
          value={values.failedToDo}
          onChange={(value) => onChange("failedToDo", value)}
          locked={locked}
        />
        <ReflectionField
          label="Why?"
          value={values.whyFailed}
          onChange={(value) => onChange("whyFailed", value)}
          locked={locked}
        />
        <ReflectionField
          label="What will I improve tomorrow?"
          value={values.improveTomorrow}
          onChange={(value) => onChange("improveTomorrow", value)}
          locked={locked}
        />
      </div>
    </section>
  );
}
