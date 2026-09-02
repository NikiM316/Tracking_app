"use client";

import { useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { startChallenge } from "@/features/monk/actions/challenge";
import { formatLongDate } from "@/features/monk/lib/format";
import type { ClosedChallengeSummary } from "@/features/monk/types";

type ResetScreenProps = {
  summary: ClosedChallengeSummary;
  defaultLimit: number;
  variant: "failed" | "completed";
};

export function ResetScreen({
  summary,
  defaultLimit,
  variant,
}: ResetScreenProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { challenge, canStartNow, canStartOn } = summary;

  const title =
    variant === "completed" ? "180 DAYS COMPLETED" : "CHALLENGE FAILED";

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startChallenge({
        socialMediaLimitMinutes: defaultLimit,
      });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <section
      className={`rounded-2xl border p-6 ${
        variant === "completed"
          ? "border-emerald-900/70 bg-emerald-950/30"
          : "border-red-900/80 bg-red-950/40"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.2em] ${
          variant === "completed" ? "text-emerald-400" : "text-red-400"
        }`}
      >
        Attempt #{challenge.attempt_number}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">{title}</h2>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-400">Started</dt>
          <dd className="font-medium">{formatLongDate(challenge.started_on)}</dd>
        </div>
        {challenge.ended_on ? (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-400">
              {variant === "completed" ? "Finished" : "Failed on"}
            </dt>
            <dd className="font-medium">
              {challenge.ended_day_number
                ? `Day ${challenge.ended_day_number} · ${formatLongDate(challenge.ended_on)}`
                : formatLongDate(challenge.ended_on)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-400">Days completed</dt>
          <dd className="font-medium">{challenge.successful_days_count}</dd>
        </div>
      </dl>

      {variant === "failed" ? (
        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-red-300">
          Reset required
        </p>
      ) : (
        <p className="mt-6 text-sm text-zinc-300">
          The record stands. Start another attempt only if you choose to.
        </p>
      )}

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <Button
        className="mt-6"
        fullWidth
        variant={variant === "failed" ? "danger" : "primary"}
        disabled={!canStartNow || isPending}
        onClick={handleStart}
      >
        {isPending
          ? "Starting…"
          : canStartNow
            ? `Start challenge #${challenge.attempt_number + 1}`
            : `Available ${formatLongDate(canStartOn)}`}
      </Button>
    </section>
  );
}
