"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";

import { updateWorkoutCycleDay } from "@/features/fitness/actions/workout";
import { CYCLE_PROGRAM } from "@/lib/program/cycle";

type CycleDaySelectorProps = {
  workoutId: string;
  cycleDay: number;
};

export function CycleDaySelector({
  workoutId,
  cycleDay,
}: CycleDaySelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextCycleDay = Number(event.target.value);
    if (!Number.isInteger(nextCycleDay) || nextCycleDay === cycleDay) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await updateWorkoutCycleDay(workoutId, nextCycleDay);

      if (result.error || !result.workout) {
        setErrorMessage(result.error ?? "Failed to update cycle day.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <label className="sr-only" htmlFor="cycle-day-selector">
        Select workout day
      </label>
      <select
        id="cycle-day-selector"
        aria-label="Select workout day"
        value={cycleDay}
        disabled={isPending}
        onChange={handleChange}
        className="h-9 w-full max-w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-950 bg-[length:1rem] bg-[right_0.6rem_center] bg-no-repeat px-3 pr-9 text-sm font-semibold text-emerald-400 outline-none focus:border-emerald-500 disabled:cursor-wait disabled:opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234ade80'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        }}
      >
        {CYCLE_PROGRAM.map((day) => (
          <option key={day.day} value={day.day} className="bg-zinc-950 text-zinc-100">
            Day {day.day}: {day.label}
          </option>
        ))}
      </select>
      {isPending ? (
        <p className="text-[11px] font-medium text-zinc-500">Saving…</p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-[11px] font-medium text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
