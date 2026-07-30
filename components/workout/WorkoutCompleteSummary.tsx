"use client";

import type { LocalSet } from "@/components/workout/SetRow";
import type { Exercise } from "@/lib/supabase/types";

type WorkoutCompleteSummaryProps = {
  programLabel: string | null;
  completedAt: string;
  exercises: Exercise[];
  setsByExercise: Record<string, LocalSet[]>;
  notesByExercise: Record<string, string>;
};

const setCategoryLabel: Record<string, string> = {
  top_set: "Top set",
  working_set: "Normal",
  back_off: "Back-off",
};

export function WorkoutCompleteSummary({
  programLabel,
  completedAt,
  exercises,
  setsByExercise,
  notesByExercise,
}: WorkoutCompleteSummaryProps) {
  const formattedTime = new Date(completedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-50">Workout Complete!</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {programLabel ?? "Workout"} · finished at {formattedTime}
        </p>
      </section>

      {exercises.map((exercise) => {
        const sets = setsByExercise[exercise.id] ?? [];
        const note = notesByExercise[exercise.id]?.trim();

        if (sets.length === 0 && !note) {
          return null;
        }

        return (
          <section
            key={exercise.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
          >
            <h3 className="text-base font-semibold text-zinc-50">{exercise.name}</h3>

            {sets.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {sets.map((set, index) => (
                  <li
                    key={set.localId}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm"
                  >
                    <span className="text-zinc-400">
                      Set {index + 1} · {setCategoryLabel[set.set_category] ?? set.set_category}
                    </span>
                    <span className="font-semibold text-zinc-100">
                      {set.weight != null ? `${set.weight} kg × ` : ""}
                      {set.reps} reps
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {note ? (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {note}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
