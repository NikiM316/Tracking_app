"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  formatWaterMl,
  parseWaterAmountToMl,
  QUICK_WATER_AMOUNTS_ML,
  WATER_GOAL_ML,
  WATER_INCREMENT_ML,
  type WaterUnit,
} from "@/lib/utils/water";

type WaterTrackerProps = {
  waterMl: number;
  goalMl?: number;
  disabled?: boolean;
  onAdd: (amountMl: number) => void;
};

const GOAL_TOAST_MS = 3200;

function fireGoalConfetti() {
  const defaults = {
    spread: 70,
    startVelocity: 38,
    ticks: 90,
    zIndex: 1000,
    colors: ["#38bdf8", "#7dd3fc", "#e0f2fe", "#34d399", "#a7f3d0"],
  };

  void confetti({
    ...defaults,
    particleCount: 90,
    origin: { x: 0.5, y: 0.65 },
  });

  window.setTimeout(() => {
    void confetti({
      ...defaults,
      particleCount: 45,
      angle: 60,
      origin: { x: 0, y: 0.7 },
    });
    void confetti({
      ...defaults,
      particleCount: 45,
      angle: 120,
      origin: { x: 1, y: 0.7 },
    });
  }, 180);
}

export function WaterTracker({
  waterMl,
  goalMl = WATER_GOAL_ML,
  disabled = false,
  onAdd,
}: WaterTrackerProps) {
  const [amountText, setAmountText] = useState(String(WATER_INCREMENT_ML));
  const [unit, setUnit] = useState<WaterUnit>("ml");
  const [showGoalToast, setShowGoalToast] = useState(false);

  // Session-scoped: if the goal is already met on mount, never celebrate again.
  const hasCelebratedGoalRef = useRef(waterMl >= goalMl);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = Math.min(100, Math.round((waterMl / goalMl) * 100));
  const remaining = Math.max(0, goalMl - waterMl);
  const liters = (waterMl / 1000).toFixed(waterMl % 1000 === 0 ? 0 : 2);
  const parsedMl = parseWaterAmountToMl(amountText, unit);
  const canAdd = !disabled && parsedMl != null;
  const goalReached = waterMl >= goalMl;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function celebrateGoalIfNeeded(previousMl: number, nextMl: number) {
    if (hasCelebratedGoalRef.current) return;
    if (previousMl >= goalMl || nextMl < goalMl) return;

    hasCelebratedGoalRef.current = true;
    fireGoalConfetti();
    setShowGoalToast(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowGoalToast(false);
      toastTimerRef.current = null;
    }, GOAL_TOAST_MS);
  }

  function handleAdd() {
    if (parsedMl == null || disabled) return;
    celebrateGoalIfNeeded(waterMl, waterMl + parsedMl);
    onAdd(parsedMl);
  }

  function handleQuickAdd(amountMl: number) {
    if (disabled) return;
    celebrateGoalIfNeeded(waterMl, waterMl + amountMl);
    onAdd(amountMl);
  }

  return (
    <section className="relative rounded-2xl border border-sky-500/30 bg-zinc-900/60 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
          Water
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-50">
          {waterMl.toLocaleString()} ml
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {goalReached
            ? `${liters} L · Daily goal reached`
            : `${liters} L · ${remaining.toLocaleString()} ml to ${goalMl.toLocaleString()} ml`}
        </p>
      </div>

      <div
        className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goalMl}
        aria-valuenow={Math.min(waterMl, goalMl)}
        aria-label="Daily water intake progress"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${
            goalReached ? "bg-emerald-400" : "bg-sky-400"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs font-medium tabular-nums text-zinc-500">
        {progress}%
      </p>

      <div
        aria-live="polite"
        className={`mt-3 overflow-hidden transition-all duration-300 ease-out ${
          showGoalToast
            ? "max-h-12 opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-300">
          Daily water goal reached!
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_WATER_AMOUNTS_ML.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={disabled}
            onClick={() => handleQuickAdd(amount)}
            className="min-h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-xs font-semibold text-zinc-300 transition-colors hover:border-sky-500/50 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +{formatWaterMl(amount)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="water-amount"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Custom amount
          </label>
          <input
            id="water-amount"
            type="text"
            inputMode="decimal"
            value={amountText}
            disabled={disabled}
            placeholder={unit === "L" ? "1.5" : String(WATER_INCREMENT_ML)}
            onChange={(event) => setAmountText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
            className="mt-1.5 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-medium text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500 disabled:opacity-40"
          />
        </div>

        <div
          role="group"
          aria-label="Water unit"
          className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-700 bg-zinc-950 p-1"
        >
          {(["ml", "L"] as const).map((option) => {
            const selected = unit === option;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => setUnit(option)}
                className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  selected
                    ? "bg-sky-500/20 text-sky-300"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <Button
          className="shrink-0 min-h-11 bg-sky-500 text-zinc-950 hover:bg-sky-400 disabled:bg-sky-500/40"
          disabled={!canAdd}
          onClick={handleAdd}
          aria-label={
            parsedMl != null
              ? `Add ${formatWaterMl(parsedMl)} of water`
              : "Add water"
          }
        >
          Add
        </Button>
      </div>

      {amountText.trim() && parsedMl == null ? (
        <p className="mt-2 text-xs text-red-300">
          Enter a valid amount (e.g. 200, 1.5, or 750ml).
        </p>
      ) : null}
    </section>
  );
}
