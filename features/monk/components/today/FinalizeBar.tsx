"use client";

import { useState } from "react";

import { Button } from "@/features/core/components/Button";
import { finalizeToday } from "@/features/monk/actions/today";
import type { DayScore } from "@/features/monk/lib/accountability";

import type { ChecklistAct, ReflectionDraft } from "./checklist-shared";

type FinalizeBarProps = {
  dayId: string;
  locked: boolean;
  isPending: boolean;
  liveScore: DayScore;
  reflection: ReflectionDraft;
  act: ChecklistAct;
};

export function FinalizeBar({
  dayId,
  locked,
  isPending,
  liveScore,
  reflection,
  act,
}: FinalizeBarProps) {
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  if (locked) {
    return (
      <p className="text-center text-xs text-zinc-500">
        This day is locked. Casual edits are not allowed.
      </p>
    );
  }

  if (confirmFinalize) {
    return (
      <section
        className={`rounded-2xl border p-5 ${
          liveScore.passed
            ? "border-emerald-900/70 bg-emerald-950/30"
            : "border-red-900/80 bg-red-950/40"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Confirm finalization
        </p>
        <p className="mt-2 text-2xl font-bold">
          {liveScore.passed ? "PASSED" : "FAILED"}
        </p>
        <p className="mt-2 text-sm text-zinc-300">
          {liveScore.mandatoryFailures} mandatory miss
          {liveScore.mandatoryFailures === 1 ? "" : "es"} ·{" "}
          {liveScore.mandatoryCount} required.
          {liveScore.passed
            ? " The day will lock as passed."
            : " This will fail the day and reset the 180-day challenge."}
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            fullWidth
            variant={liveScore.passed ? "primary" : "danger"}
            disabled={isPending}
            onClick={() =>
              act(async () => {
                const result = await finalizeToday(dayId, {
                  accomplished: reflection.accomplished,
                  failedToDo: reflection.failedToDo,
                  whyFailed: reflection.whyFailed,
                  improveTomorrow: reflection.improveTomorrow,
                });
                if (!("error" in result)) {
                  setConfirmFinalize(false);
                }
                return result;
              })
            }
          >
            {liveScore.passed ? "Lock as passed" : "Confirm failure"}
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => setConfirmFinalize(false)}
          >
            Cancel
          </Button>
        </div>
      </section>
    );
  }

  return (
    <Button fullWidth onClick={() => setConfirmFinalize(true)}>
      Finalize day · {liveScore.passed ? "on track to pass" : "will fail"}
    </Button>
  );
}
