"use client";

import { useEffect, useId, useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { addStudyItemAsTask } from "@/features/monk/actions/today";
import type { ActionResult } from "@/features/monk/types";
import type { StudyPlanItem } from "@/lib/supabase/monk-types";

type StudyItemAddModalProps = {
  dayId: string;
  item: StudyPlanItem;
  onClose: () => void;
  onAdded: (result: ActionResult) => void;
};

export function StudyItemAddModal({
  dayId,
  item,
  onClose,
  onAdded,
}: StudyItemAddModalProps) {
  const targetId = useId();
  const mandatoryId = useId();
  const [target, setTarget] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTarget = target.trim();
    if (!trimmedTarget) {
      setError("Set today's target before adding.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await addStudyItemAsTask({
        dayId,
        studyItemId: item.id,
        isMandatory,
        todayTarget: trimmedTarget,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onAdded(result);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/80 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0"
        onClick={onClose}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-item-add-title"
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md bg-zinc-950 px-5 pt-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Timebox
        </p>
        <h2
          id="study-item-add-title"
          className="mt-2 text-lg font-semibold leading-snug text-zinc-50"
        >
          {item.title}
        </h2>

        <label
          htmlFor={targetId}
          className="mt-5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Today&apos;s Target (e.g., Modules 1-3, or 2 Hours)
        </label>
        <input
          id={targetId}
          value={target}
          autoFocus
          placeholder="Modules 1–3"
          onChange={(event) => setTarget(event.target.value)}
          className="mt-1.5 min-h-12 w-full bg-zinc-900 px-3 text-base text-zinc-50 outline-none focus:ring-1 focus:ring-emerald-500"
        />

        <label
          htmlFor={mandatoryId}
          className="mt-4 flex min-h-12 items-center gap-3 text-sm text-zinc-300"
        >
          <input
            id={mandatoryId}
            type="checkbox"
            checked={isMandatory}
            onChange={(event) => setIsMandatory(event.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          Mandatory Task
        </label>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={isPending}>
            {isPending ? "Adding…" : "Confirm & Add"}
          </Button>
        </div>
      </form>
    </div>
  );
}
