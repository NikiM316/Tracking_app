"use client";

import type {
  PreviousExerciseSession,
  PreviousSessionSet,
} from "@/lib/actions/workout";

type PreviousSessionGhostProps = {
  session: PreviousExerciseSession | null;
};

function formatPreviousSets(sets: PreviousSessionSet[]): string {
  const sorted = [...sets].sort((a, b) => a.set_order - b.set_order);

  if (sorted.length === 0) {
    return "";
  }

  const firstWeight = sorted[0].weight;
  const allSameWeight = sorted.every((set) => set.weight === firstWeight);

  if (allSameWeight && firstWeight != null) {
    return `${firstWeight}kg × ${sorted.map((set) => set.reps).join(", ")}`;
  }

  return sorted
    .map((set) =>
      set.weight != null ? `${set.weight}kg × ${set.reps}` : `${set.reps} reps`,
    )
    .join(", ");
}

export function PreviousSessionGhost({ session }: PreviousSessionGhostProps) {
  if (!session) {
    return <p className="mb-3 text-xs text-zinc-500">No previous data</p>;
  }

  return (
    <p className="mb-3 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-500">
      <span className="font-semibold text-zinc-400">Previous: </span>
      {formatPreviousSets(session.sets)}
    </p>
  );
}
