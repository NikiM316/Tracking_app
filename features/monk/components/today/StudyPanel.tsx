"use client";

import { useState } from "react";

import { Button } from "@/features/core/components/Button";
import {
  completeStudyModule,
  toggleStudyPlanItem,
} from "@/features/monk/actions/today";
import { StudyItemAddModal } from "@/features/monk/components/today/StudyItemAddModal";
import type { ActionResult, StudyWeekPanel } from "@/features/monk/types";
import type { StudyPlanItem } from "@/lib/supabase/monk-types";

import type { ChecklistAct } from "./checklist-shared";

type StudyPanelProps = {
  dayId: string;
  studyWeek: StudyWeekPanel;
  studyItems: StudyPlanItem[];
  locked: boolean;
  isPending: boolean;
  mutatingIds: Set<string>;
  act: ChecklistAct;
  onActionResult: (result: ActionResult) => void;
};

export function StudyPanel({
  dayId,
  studyWeek,
  studyItems,
  locked,
  isPending,
  mutatingIds,
  act,
  onActionResult,
}: StudyPanelProps) {
  const [confirmCompleteModule, setConfirmCompleteModule] = useState(false);
  const [selectedStudyItem, setSelectedStudyItem] = useState<StudyPlanItem | null>(
    null,
  );

  return (
    <>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Study plan
        </p>
        {studyWeek.completed ? (
          <>
            <h2 className="mt-2 text-lg font-semibold">Plan complete</h2>
            <p className="mt-1 text-sm text-zinc-400">
              All modules are complete. The plan does not reset with Monk Mode.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-lg font-semibold">
              Module {studyWeek.weekNumber} / {studyWeek.totalWeeks}
            </h2>
            <p className="mt-1 font-medium text-zinc-200">{studyWeek.title}</p>
            {studyWeek.focus ? (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {studyWeek.focus}
              </p>
            ) : null}
            {studyWeek.buildTarget ? (
              <p className="mt-2 text-sm text-zinc-300">
                Build: {studyWeek.buildTarget}
              </p>
            ) : null}
            {studyItems.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {studyItems.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      item.is_completed
                        ? "border-emerald-800/80 bg-emerald-950/30"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={locked || mutatingIds.has(item.id)}
                      onClick={() =>
                        act(
                          () => toggleStudyPlanItem(item.id, !item.is_completed),
                          { type: "toggleStudyItem", id: item.id },
                        )
                      }
                      className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                          item.is_completed
                            ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                            : "border-zinc-600"
                        }`}
                      >
                        {item.is_completed ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-medium ${
                            item.is_completed
                              ? "text-zinc-400 line-through"
                              : "text-zinc-100"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="block text-xs uppercase tracking-wide text-zinc-500">
                          {item.kind}
                          {item.is_primary ? " · primary" : ""}
                        </span>
                      </span>
                    </button>
                    {!locked ? (
                      <Button
                        variant={item.is_completed ? "primary" : "secondary"}
                        className="min-h-10 shrink-0 px-3 text-xs"
                        disabled={isPending || item.is_completed}
                        aria-label={
                          item.is_completed ? "Added and complete" : "Add"
                        }
                        onClick={() => setSelectedStudyItem(item)}
                      >
                        {item.is_completed ? "✓" : "Add"}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {!locked ? (
              confirmCompleteModule ? (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="text-sm text-zinc-300">
                    Are you sure you want to complete this module and move to the
                    next?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      fullWidth
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => {
                        const weekId = studyWeek.weekId;
                        if (!weekId) return;
                        act(async () => {
                          const result = await completeStudyModule(weekId);
                          if (!("error" in result)) {
                            setConfirmCompleteModule(false);
                          }
                          return result;
                        });
                      }}
                    >
                      Complete module
                    </Button>
                    <Button
                      fullWidth
                      variant="ghost"
                      onClick={() => setConfirmCompleteModule(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  fullWidth
                  variant="secondary"
                  className="mt-4"
                  disabled={isPending}
                  onClick={() => setConfirmCompleteModule(true)}
                >
                  Mark Module as Complete
                </Button>
              )
            ) : null}
          </>
        )}
      </section>

      {selectedStudyItem ? (
        <StudyItemAddModal
          dayId={dayId}
          item={selectedStudyItem}
          onClose={() => setSelectedStudyItem(null)}
          onAdded={(result) => {
            setSelectedStudyItem(null);
            onActionResult(result);
          }}
        />
      ) : null}
    </>
  );
}
