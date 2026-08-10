"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/features/core/components/Button";
import { formatRestDuration } from "@/lib/utils/format-rest";

function getNow(): number {
  return Date.now();
}

type PersistedRestTimer = {
  startedAt: number | null;
  accumulatedMs: number;
  running: boolean;
};

type InitialTimerSnapshot = {
  accumulatedMs: number;
  startedAt: number | null;
  isRunning: boolean;
  displaySeconds: number;
  isTouched: boolean;
};

function storageKeyFor(timerId: string): string {
  return `rest-timer:${timerId}`;
}

function readPersisted(timerId: string): PersistedRestTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKeyFor(timerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRestTimer;
    if (
      typeof parsed.accumulatedMs !== "number" ||
      typeof parsed.running !== "boolean" ||
      (parsed.startedAt != null && typeof parsed.startedAt !== "number")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(timerId: string, state: PersistedRestTimer): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKeyFor(timerId), JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures; in-memory refs still work.
  }
}

export function clearRestTimerStorage(timerId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKeyFor(timerId));
  } catch {
    // Ignore storage failures.
  }
}

function elapsedSeconds(
  accumulatedMs: number,
  startedAt: number | null,
  now = getNow(),
): number {
  const runningMs = startedAt == null ? 0 : now - startedAt;
  return Math.floor((accumulatedMs + runningMs) / 1000);
}

function resolveInitialSnapshot(
  timerId: string,
  initialSeconds: number | null,
): InitialTimerSnapshot {
  const persisted = readPersisted(timerId);
  const accumulatedMs =
    persisted?.accumulatedMs ?? (initialSeconds ?? 0) * 1000;
  const startedAt = persisted?.running
    ? (persisted.startedAt ?? getNow())
    : null;
  const isRunning = Boolean(persisted?.running && startedAt != null);

  return {
    accumulatedMs,
    startedAt,
    isRunning,
    displaySeconds: elapsedSeconds(accumulatedMs, startedAt),
    isTouched:
      initialSeconds != null ||
      Boolean(persisted && persisted.accumulatedMs > 0),
  };
}

type RestTimerProps = {
  /** Stable identity for this timer; used to survive parent remounts. */
  timerId: string;
  disabled?: boolean;
  initialSeconds?: number | null;
  onElapsedChange?: (seconds: number) => void;
};

export function RestTimer({
  timerId,
  disabled = false,
  initialSeconds = null,
  onElapsedChange,
}: RestTimerProps) {
  // Plain state snapshot — never read ref.current during render.
  const [snapshot] = useState(() =>
    resolveInitialSnapshot(timerId, initialSeconds),
  );

  const accumulatedMsRef = useRef(snapshot.accumulatedMs);
  const startedAtRef = useRef<number | null>(snapshot.startedAt);
  const onElapsedChangeRef = useRef(onElapsedChange);
  const isTouchedRef = useRef(snapshot.isTouched);

  const [isRunning, setIsRunning] = useState(snapshot.isRunning);
  const [displaySeconds, setDisplaySeconds] = useState(snapshot.displaySeconds);

  function persist() {
    writePersisted(timerId, {
      startedAt: startedAtRef.current,
      accumulatedMs: accumulatedMsRef.current,
      running: startedAtRef.current != null,
    });
  }

  useEffect(() => {
    onElapsedChangeRef.current = onElapsedChange;
  }, [onElapsedChange]);

  useEffect(() => {
    if (!snapshot.isTouched) return;
    onElapsedChangeRef.current?.(snapshot.displaySeconds);
  }, [snapshot]);

  useEffect(() => {
    if (!isRunning) return;

    function tick() {
      if (startedAtRef.current == null) return;
      const seconds = elapsedSeconds(
        accumulatedMsRef.current,
        startedAtRef.current,
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
    persist();
    setIsRunning(true);
  }

  function handleStop() {
    if (!isRunning || startedAtRef.current == null) return;
    accumulatedMsRef.current += getNow() - startedAtRef.current;
    startedAtRef.current = null;
    const seconds = elapsedSeconds(accumulatedMsRef.current, null);
    setDisplaySeconds(seconds);
    setIsRunning(false);
    persist();
    onElapsedChangeRef.current?.(seconds);
  }

  function handleReset() {
    if (disabled) return;
    startedAtRef.current = null;
    accumulatedMsRef.current = 0;
    isTouchedRef.current = true;
    setDisplaySeconds(0);
    setIsRunning(false);
    clearRestTimerStorage(timerId);
    onElapsedChangeRef.current?.(0);
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
        <Button
          variant="secondary"
          className="min-h-9 px-2.5 text-xs"
          disabled={disabled || (displaySeconds === 0 && !isRunning)}
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
