"use client";

import { useState } from "react";

import type { CycleDayOverview } from "@/features/fitness/actions/cycle";

type CycleDayAccordionProps = {
  days: CycleDayOverview[];
  currentCycleDay: number;
};

export function CycleDayAccordion({
  days,
  currentCycleDay,
}: CycleDayAccordionProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  function toggleDay(day: number) {
    setExpandedDay((current) => (current === day ? null : day));
  }

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const isExpanded = expandedDay === day.day;
        const isToday = day.day === currentCycleDay;

        return (
          <section
            key={day.day}
            className={`overflow-hidden rounded-2xl border bg-zinc-900/60 ${
              isToday ? "border-emerald-500/40" : "border-zinc-800"
            }`}
          >
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => toggleDay(day.day)}
              className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-900"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Day {day.day}
                  {isToday ? (
                    <span className="ml-2 text-emerald-400">Today</span>
                  ) : null}
                </p>
                <h3 className="mt-1 text-base font-semibold text-zinc-50">
                  {day.label}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {day.exercises.length}{" "}
                  {day.exercises.length === 1 ? "exercise" : "exercises"}
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
              <div className="border-t border-zinc-800 px-5 py-4">
                {day.exercises.length === 0 ? (
                  <p className="text-sm text-zinc-500">Rest day — no exercises scheduled.</p>
                ) : (
                  <ul className="space-y-2">
                    {day.exercises.map((exercise) => (
                      <li
                        key={exercise.slug}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200"
                      >
                        {exercise.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
