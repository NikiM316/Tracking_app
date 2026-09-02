"use client";

import { useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { startChallenge } from "@/features/monk/actions/challenge";
import type { HabitDraft } from "@/features/monk/types";

type SetupFormProps = {
  defaultLimit: number;
  existingHabitCount: number;
};

type DraftRow = HabitDraft & { key: string };

function newRow(key: string): DraftRow {
  return {
    key,
    name: "",
    isMandatory: true,
    targetValue: null,
    targetUnit: null,
  };
}

export function SetupForm({ defaultLimit, existingHabitCount }: SetupFormProps) {
  const [isPending, startTransition] = useTransition();
  const [limit, setLimit] = useState(String(defaultLimit));
  const [rows, setRows] = useState<DraftRow[]>([
    newRow("habit-1"),
    newRow("habit-2"),
    newRow("habit-3"),
  ]);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
      setError("Set a social-media limit of 0 minutes or more.");
      return;
    }

    const habits = rows
      .map((row) => ({
        name: row.name.trim(),
        isMandatory: row.isMandatory,
        targetValue: row.targetValue,
        targetUnit: row.targetUnit?.trim() || null,
      }))
      .filter((row) => row.name.length > 0);

    if (existingHabitCount === 0 && habits.length === 0) {
      setError("Add at least one habit. It should be mandatory.");
      return;
    }

    startTransition(async () => {
      const result = await startChallenge({
        socialMediaLimitMinutes: parsedLimit,
        habits: existingHabitCount === 0 ? habits : undefined,
      });

      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Begin
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">
          180 days. Binary. No quiet edits.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          One missed mandatory item fails the day. One failed day resets the
          challenge. History is kept.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Digital fasting
        </h3>
        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Daily social-media limit (minutes)
        </label>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          className="mt-1.5 min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base font-semibold text-zinc-50 outline-none focus:border-emerald-500"
        />
      </section>

      {existingHabitCount === 0 ? (
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Mandatory habits
          </h3>
          <p className="text-sm text-zinc-500">
            These appear every day. You can change targets later; history keeps
            the old snapshot.
          </p>
          {rows.map((row, index) => (
            <div key={row.key} className="space-y-2 rounded-xl border border-zinc-800 p-3">
              <input
                value={row.name}
                placeholder={`Habit ${index + 1}`}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item) =>
                      item.key === row.key
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
                className="min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-emerald-500"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Target"
                  value={row.targetValue ?? ""}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.key === row.key
                          ? {
                              ...item,
                              targetValue:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            }
                          : item,
                      ),
                    )
                  }
                  className="min-h-11 w-24 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none focus:border-emerald-500"
                />
                <input
                  placeholder="unit (pages, min)"
                  value={row.targetUnit ?? ""}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.key === row.key
                          ? { ...item, targetUnit: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() =>
              setRows((current) => [...current, newRow(`habit-${current.length + 1}`)])
            }
          >
            Add habit
          </Button>
        </section>
      ) : (
        <p className="text-sm text-zinc-400">
          {existingHabitCount} habit{existingHabitCount === 1 ? "" : "s"} already
          defined. They will appear on day 1.
        </p>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? "Starting…" : "Start 180-day challenge"}
      </Button>
    </form>
  );
}
