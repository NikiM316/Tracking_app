"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { formatRestDuration } from "@/lib/utils/format-rest";

function getNow(): number {
  return Date.now();
}

type RestTimerProps = {
  disabled?: boolean;
  initialSeconds?: number | null;
  onElapsedChange?: (seconds: number) => void;
};

export function RestTimer({
  disabled = false,
  initialSeconds = null,
  onElapsedChange,
}: RestTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [displaySeconds, setDisplaySeconds] = useState(initialSeconds ?? 0);
  const accumulatedMsRef = useRef((initialSeconds ?? 0) * 1000);
  const startedAtRef = useRef<number | null>(null);
  const onElapsedChangeRef = useRef(onElapsedChange);
  const isTouchedRef = useRef(initialSeconds != null);

  useEffect(() => {
    onElapsedChangeRef.current = onElapsedChange;
  }, [onElapsedChange]);

  useEffect(() => {
    if (initialSeconds == null) return;
    isTouchedRef.current = true;
    onElapsedChangeRef.current?.(initialSeconds);
    // Report saved rest to parent once on mount when reloading history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    function tick() {
      if (startedAtRef.current == null) return;
      const seconds = Math.floor(
        (accumulatedMsRef.current + (getNow() - startedAtRef.current)) / 1000,
      );
      setDisplaySeconds(seconds);
      if (isTouchedRef.current) {
        onElapsedChangeRef.current?.(seconds);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  function handleStart() {
    if (disabled || isRunning) return;
    isTouchedRef.current = true;
    startedAtRef.current = getNow();
    setIsRunning(true);
  }

  function handleStop() {
    if (!isRunning || startedAtRef.current == null) return;
    accumulatedMsRef.current += getNow() - startedAtRef.current;
    startedAtRef.current = null;
    const seconds = Math.floor(accumulatedMsRef.current / 1000);
    setDisplaySeconds(seconds);
    setIsRunning(false);
    onElapsedChangeRef.current?.(seconds);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Rest
        </p>
        <p className="text-lg font-bold tabular-nums text-emerald-400">
          {formatRestDuration(displaySeconds)}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button
          variant="secondary"
          className="min-h-9 px-2.5 text-xs"
          disabled={disabled || isRunning}
          onClick={handleStart}
        >
          Start
        </Button>
        <Button
          variant="secondary"
          className="min-h-9 px-2.5 text-xs"
          disabled={disabled || !isRunning}
          onClick={handleStop}
        >
          Stop
        </Button>
      </div>
    </div>
  );
}
