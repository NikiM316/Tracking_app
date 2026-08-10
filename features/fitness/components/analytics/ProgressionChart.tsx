"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState, useTransition } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getExerciseProgress,
  type ExerciseOption,
  type ExerciseProgressPoint,
} from "@/features/fitness/actions/analytics";
import { formatRestDuration } from "@/lib/utils/format-rest";

type ProgressionChartProps = {
  exercises: ExerciseOption[];
};

type ChartPoint = ExerciseProgressPoint & { label: string };

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
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#71717a"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#3f3f46" }}
                minTickGap={24}
              />
              <YAxis
                stroke="#71717a"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "0.75rem",
                  fontSize: "0.75rem",
                }}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(value, _name, item) => {
                  const point = item.payload as ChartPoint;
                  const restLabel =
                    point.bestSetRestSeconds != null
                      ? ` · ${formatRestDuration(point.bestSetRestSeconds)} rest`
                      : "";
                  return [
                    `${value} kg (${point.maxWeight}kg × ${point.bestReps}${restLabel})`,
                    "Est. 1RM",
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="estimatedOneRepMax"
                name="Est. 1RM"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3, fill: "#34d399" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
