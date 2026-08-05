"use client";

import { useState } from "react";

import type { HistoryWorkoutEntry } from "@/lib/actions/history";
import { formatRestDuration } from "@/lib/utils/format-rest";

type WorkoutHistoryAccordionProps = {
  entries: HistoryWorkoutEntry[];
};

const setCategoryLabel: Record<string, string> = {
  warmup: "Warm-up",
  top_set: "Top set",
  working_set: "Normal",
  back_off: "Back-off",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatDate(dateStr: string): string {
  // Manual format avoids SSR/client locale mismatches from toLocaleDateString.
  const date = new Date(`${dateStr}T00:00:00`);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function WorkoutHistoryAccordion({ entries }: WorkoutHistoryAccordionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    entries[0]?.workout.id ?? null,
  );

  function toggle(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div className="space-y-3">
      {entries.map(({ workout, programLabel, exercises }) => {
        const isExpanded = expandedId === workout.id;
        const totalSets = exercises.reduce((sum, entry) => sum + entry.sets.length, 0);

        return (
          <section
            key={workout.id}
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
          >
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => toggle(workout.id)}
              className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-900"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Day {workout.cycle_day} · {formatDate(workout.date)}
                </p>
                <h3 className="mt-1 text-base font-semibold text-zinc-50">
                  {programLabel}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {exercises.length} exercises · {totalSets} sets
                </span>
                <svg
                  aria-hidden="true"
                  className={`h-5 w-5 text-zinc-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 9l-7 7-7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>

            {isExpanded ? (
              <div className="space-y-3 border-t border-zinc-800 px-5 py-4">
                {exercises.length === 0 ? (
                  <p className="text-sm text-zinc-500">No sets logged.</p>
                ) : (
                  exercises.map(({ exercise, sets, note }) => (
                    <div
                      key={exercise.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
                    >
                      <p className="text-sm font-semibold text-zinc-200">
                        {exercise.name}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {sets.map((set, index) => (
                          <li
                            key={set.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-zinc-500">
                              Set {index + 1} ·{" "}
                              {setCategoryLabel[set.set_category] ?? set.set_category}
                            </span>
                            <span className="font-medium text-zinc-100">
                              {set.weight_kg != null ? `${set.weight_kg} kg × ` : ""}
                              {set.reps} reps
                              {set.rest_seconds != null
                                ? ` (${formatRestDuration(set.rest_seconds)} rest)`
                                : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {note ? (
                        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          {note}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
