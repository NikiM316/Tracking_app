"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";

import {
  setGamingLimit,
  setGamingMinutes,
  setSocialMediaLimit,
  setSocialMediaMinutes,
} from "@/features/monk/actions/today";
import { scoreDay } from "@/features/monk/lib/accountability";
import type { ActionResult } from "@/features/monk/types";

import {
  applyChecklistOptimistic,
  resolveMinutesDraft,
  runResult,
  type ChecklistOptimisticAction,
  type ChecklistProps,
  type MinutesDraft,
  type ReflectionDraft,
} from "./checklist-shared";
import { DigitalFastingSection } from "./DigitalFastingSection";
import { FinalizeBar } from "./FinalizeBar";
import { HabitsSection } from "./HabitsSection";
import { ReflectionSection } from "./ReflectionSection";
import { StudyPanel } from "./StudyPanel";
import { TasksSection } from "./TasksSection";

export function TodayChecklist(data: ChecklistProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, applyOptimistic] = useOptimistic(
    {
      habits: data.habits,
      tasks: data.tasks,
      studyItems: data.studyWeek?.items ?? [],
    },
    applyChecklistOptimistic,
  );
  const mutatingIdsRef = useRef(new Set<string>());
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(() => new Set());
  const [socialMediaDraft, setSocialMediaDraft] = useState<MinutesDraft | null>(
    null,
  );
  const [gamingDraft, setGamingDraft] = useState<MinutesDraft | null>(null);
  const [reflection, setReflection] = useState<ReflectionDraft>({
    accomplished: data.day.accomplished ?? "",
    failedToDo: data.day.failed_to_do ?? "",
    whyFailed: data.day.why_failed ?? "",
    improveTomorrow: data.day.improve_tomorrow ?? "",
  });

  const socialMedia = resolveMinutesDraft(
    data.day.id,
    {
      actualMinutes: data.day.social_media_actual_minutes,
      limitMinutes: data.day.social_media_limit_minutes,
    },
    socialMediaDraft,
  );
  const gaming = resolveMinutesDraft(
    data.day.id,
    {
      actualMinutes: data.day.gaming_actual_minutes,
      limitMinutes: data.day.gaming_limit_minutes,
    },
    gamingDraft,
  );

  const liveScore = useMemo(
    () =>
      scoreDay({
        habits: optimistic.habits,
        tasks: optimistic.tasks,
        socialMediaLimitMinutes: socialMedia.limitMinutes,
        socialMediaActualMinutes: socialMedia.actualMinutes,
        gamingLimitMinutes: gaming.limitMinutes,
        gamingActualMinutes: gaming.actualMinutes,
        maxMandatoryFailuresAllowed: data.challenge.max_mandatory_failures_allowed,
      }),
    [
      optimistic.habits,
      optimistic.tasks,
      socialMedia.limitMinutes,
      socialMedia.actualMinutes,
      gaming.limitMinutes,
      gaming.actualMinutes,
      data.challenge.max_mandatory_failures_allowed,
    ],
  );

  const locked = data.isLocked;
  const displayedReflection: ReflectionDraft = locked
    ? {
        accomplished: data.day.accomplished ?? "",
        failedToDo: data.day.failed_to_do ?? "",
        whyFailed: data.day.why_failed ?? "",
        improveTomorrow: data.day.improve_tomorrow ?? "",
      }
    : reflection;

  function beginItemMutation(id: string): boolean {
    if (mutatingIdsRef.current.has(id)) {
      return false;
    }
    mutatingIdsRef.current.add(id);
    setMutatingIds(new Set(mutatingIdsRef.current));
    return true;
  }

  function endItemMutation(id: string) {
    mutatingIdsRef.current.delete(id);
    setMutatingIds(new Set(mutatingIdsRef.current));
  }

  function act(
    fn: () => Promise<ActionResult>,
    optimisticAction?: ChecklistOptimisticAction,
  ) {
    const itemId = optimisticAction?.id;
    if (itemId && !beginItemMutation(itemId)) {
      return;
    }

    startTransition(async () => {
      try {
        if (optimisticAction) {
          applyOptimistic(optimisticAction);
        }
        runResult(await fn(), setError);
      } finally {
        if (itemId) {
          endItemMutation(itemId);
        }
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Attempt #{data.challenge.attempt_number}
        </p>
        <p className="mt-3 text-5xl font-bold tracking-tight tabular-nums">
          DAY {data.day.day_number}
          <span className="text-2xl font-semibold text-zinc-500">
            {" "}
            / {data.challenge.target_days}
          </span>
        </p>
        <p className="mt-3 text-sm font-medium text-emerald-400">
          {data.streaks.currentStreak}-day streak
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-zinc-500">Best streak</dt>
            <dd className="font-semibold tabular-nums">{data.streaks.bestStreak}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Days passed</dt>
            <dd className="font-semibold tabular-nums">{data.streaks.daysPassed}</dd>
          </div>
        </dl>
        {locked ? (
          <p
            className={`mt-4 text-sm font-semibold uppercase tracking-widest ${
              data.day.status === "passed" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            Day {data.day.status}
          </p>
        ) : null}
      </section>

      <HabitsSection
        habits={optimistic.habits}
        locked={locked}
        mutatingIds={mutatingIds}
        act={act}
      />

      <TasksSection
        dayId={data.day.id}
        tasks={optimistic.tasks}
        locked={locked}
        isPending={isPending}
        mutatingIds={mutatingIds}
        act={act}
      />

      <DigitalFastingSection
        liveScore={liveScore}
        socialMedia={socialMedia}
        gaming={gaming}
        locked={locked}
        isPending={isPending}
        onSocialMediaActualChange={(value) => {
          setSocialMediaDraft({
            dayId: data.day.id,
            actualMinutes: value,
            limitMinutes: socialMedia.limitMinutes,
          });
          act(() => setSocialMediaMinutes(data.day.id, value));
        }}
        onSocialMediaLimitChange={(value) => {
          setSocialMediaDraft({
            dayId: data.day.id,
            actualMinutes: socialMedia.actualMinutes,
            limitMinutes: value,
          });
          act(() => setSocialMediaLimit(data.day.id, value));
        }}
        onGamingActualChange={(value) => {
          setGamingDraft({
            dayId: data.day.id,
            actualMinutes: value,
            limitMinutes: gaming.limitMinutes,
          });
          act(() => setGamingMinutes(data.day.id, value));
        }}
        onGamingLimitChange={(value) => {
          setGamingDraft({
            dayId: data.day.id,
            actualMinutes: gaming.actualMinutes,
            limitMinutes: value,
          });
          act(() => setGamingLimit(data.day.id, value));
        }}
      />

      {data.studyWeek ? (
        <StudyPanel
          dayId={data.day.id}
          studyWeek={data.studyWeek}
          studyItems={optimistic.studyItems}
          locked={locked}
          isPending={isPending}
          mutatingIds={mutatingIds}
          act={act}
          onActionResult={(result) => runResult(result, setError)}
        />
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <ReflectionSection
        locked={locked}
        values={displayedReflection}
        onChange={(field, value) =>
          setReflection((current) => ({ ...current, [field]: value }))
        }
      />

      <FinalizeBar
        dayId={data.day.id}
        locked={locked}
        isPending={isPending}
        liveScore={liveScore}
        reflection={reflection}
        act={act}
      />
    </div>
  );
}
