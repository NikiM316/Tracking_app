"use client";

import { format, parseISO } from "date-fns";
import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";

import {
  getExerciseProgress,
  type ExerciseOption,
  type ExerciseProgressPoint,
} from "@/features/fitness/actions/analytics";

import type { ChartPoint } from "./ProgressionChartCanvas";

const ProgressionChartCanvas = dynamic(
  () =>
    import("./ProgressionChartCanvas").then((mod) => mod.ProgressionChartCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <p className="text-center text-sm text-zinc-500">Loading…</p>
      </div>
    ),
  },
);

type ProgressionChartProps = {
  exercises: ExerciseOption[];
};

export function ProgressionChart({ exercises }: ProgressionChartProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    exercises[0]?.id ?? "",
  );
  const [data, setData] = useState<ExerciseProgressPoint[]>([]);
  const [loadedExerciseId, setLoadedExerciseId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedExerciseId) return;

    startTransition(async () => {
      const points = await getExerciseProgress(selectedExerciseId);
      setData(points);
      setLoadedExerciseId(selectedExerciseId);
    });
  }, [selectedExerciseId]);

  const isLoading = isPending || loadedExerciseId !== selectedExerciseId;

  const chartData: ChartPoint[] = data.map((point) => ({
    ...point,
    label: format(parseISO(point.date), "MMM d"),
  }));

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Progressive Overload</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Estimated 1-rep max over time, per exercise.
        </p>
      </div>

      <select
        aria-label="Select exercise"
        value={selectedExerciseId}
        onChange={(event) => setSelectedExerciseId(event.target.value)}
        className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-medium text-zinc-100 outline-none focus:border-emerald-500"
      >
        {exercises.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {exercise.name}
          </option>
        ))}
      </select>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-zinc-500">Loading…</p>
      ) : chartData.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          No weighted sets logged for this exercise yet.
        </p>
      ) : (
        <ProgressionChartCanvas chartData={chartData} />
      )}
    </div>
  );
}
