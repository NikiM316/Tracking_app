"use client";

import { toggleHabitLog } from "@/features/monk/actions/today";
import { formatHabitTarget } from "@/features/monk/lib/format";
import type { MonkHabitLogView } from "@/features/monk/types";

import type { ChecklistAct } from "./checklist-shared";

type HabitsSectionProps = {
  habits: MonkHabitLogView[];
  locked: boolean;
  mutatingIds: Set<string>;
  act: ChecklistAct;
};

export function HabitsSection({
  habits,
  locked,
  mutatingIds,
  act,
}: HabitsSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Habits
        </h2>
        <p className="text-xs text-zinc-500">Recurring · snapshot today</p>
      </div>
      {habits.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          No active habits. Add them on the Habits tab.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {habits.map((habit) => {
            const target = formatHabitTarget(
              habit.target_value_snapshot,
              habit.target_unit_snapshot,
            );
            return (
              <li key={habit.id}>
                <button
                  type="button"
                  disabled={locked || mutatingIds.has(habit.id)}
                  onClick={() =>
                    act(
                      () => toggleHabitLog(habit.id, !habit.is_completed),
                      { type: "toggleHabit", id: habit.id },
                    )
                  }
                  className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors disabled:opacity-50 ${
                    habit.is_completed
                      ? "border-emerald-800/80 bg-emerald-950/30"
                      : "border-zinc-800 bg-zinc-950"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                      habit.is_completed
                        ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                        : "border-zinc-600"
                    }`}
                  >
                    {habit.is_completed ? "✓" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-zinc-100">
                      {habit.name}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {habit.is_mandatory_snapshot ? "Mandatory" : "Optional"}
                      {target ? ` · ${target}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
