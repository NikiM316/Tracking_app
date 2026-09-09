"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ExerciseProgressPoint } from "@/features/fitness/actions/analytics";
import { formatRestDuration } from "@/lib/utils/format-rest";

export type ChartPoint = ExerciseProgressPoint & { label: string };

type ProgressionChartCanvasProps = {
  chartData: ChartPoint[];
};

export function ProgressionChartCanvas({
  chartData,
}: ProgressionChartCanvasProps) {
  return (
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
  );
}
