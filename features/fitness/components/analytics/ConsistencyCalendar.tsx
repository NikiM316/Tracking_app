"use client";

import { useMemo, useState } from "react";

import type { ConsistencyDay } from "@/features/fitness/actions/analytics";

type ConsistencyCalendarProps = {
  days: ConsistencyDay[];
};

const STATUS_SQUARE_STYLES: Record<ConsistencyDay["status"], string> = {
  logged: "bg-emerald-500",
  pending: "border border-amber-500/60 bg-amber-500/20",
  rest: "bg-zinc-700",
  missed: "bg-red-500/80",
  future: "border border-zinc-800 bg-zinc-900",
};

const STATUS_LABELS: Record<ConsistencyDay["status"], string> = {
  logged: "Workout completed",
  pending: "Workout in progress",
  rest: "Scheduled rest day",
  missed: "Training day missed",
  future: "Upcoming",
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

function formatDateLabel(dateStr: string): string {
  // Manual format avoids SSR/client locale mismatches from toLocaleDateString.
  const date = new Date(`${dateStr}T00:00:00`);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function formatMonthLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return MONTHS[date.getMonth()];
}

export function ConsistencyCalendar({ days }: ConsistencyCalendarProps) {
  const [selected, setSelected] = useState<ConsistencyDay | null>(null);

  const weeks = useMemo(() => {
    if (days.length === 0) return [];

    const firstDay = new Date(`${days[0].date}T00:00:00`);
    const leadingBlanks = firstDay.getDay();

    const cells: (ConsistencyDay | null)[] = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...days,
    ];

    const result: (ConsistencyDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const monthMarkers = useMemo(() => {
    const markers: { weekIndex: number; label: string }[] = [];
    let lastMonth: string | null = null;

    weeks.forEach((week, weekIndex) => {
      const firstRealDay = week.find((day) => day !== null);
      if (!firstRealDay) return;

      const month = formatMonthLabel(firstRealDay.date);
      if (month !== lastMonth) {
        markers.push({ weekIndex, label: month });
        lastMonth = month;
      }
    });

    return markers;
  }, [weeks]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-1">
            {weeks.map((_, weekIndex) => {
              const marker = monthMarkers.find((m) => m.weekIndex === weekIndex);
              return (
                <div
                  key={weekIndex}
                  className="w-3.5 shrink-0 text-[10px] leading-none text-zinc-500"
                >
                  {marker ? marker.label : ""}
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) =>
                  day ? (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={`${formatDateLabel(day.date)}: ${STATUS_LABELS[day.status]}`}
                      onClick={() => setSelected(day)}
                      className={`h-3.5 w-3.5 shrink-0 rounded-[3px] transition-transform active:scale-90 ${STATUS_SQUARE_STYLES[day.status]} ${
                        selected?.date === day.date
                          ? "ring-2 ring-emerald-300 ring-offset-1 ring-offset-zinc-950"
                          : ""
                      }`}
                    />
                  ) : (
                    <div key={`blank-${dayIndex}`} className="h-3.5 w-3.5 shrink-0" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] border border-amber-500/60 bg-amber-500/20" />
          In progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-zinc-700" />
          Rest day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-red-500/80" />
          Missed
        </span>
      </div>

      {selected ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm">
          <p className="font-medium text-zinc-200">{formatDateLabel(selected.date)}</p>
          <p className="mt-0.5 text-zinc-400">
            {STATUS_LABELS[selected.status]}
            {selected.programLabel ? ` · ${selected.programLabel}` : ""}
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Tap a square to see details.</p>
      )}
    </div>
  );
}
