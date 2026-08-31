"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/features/core/components/Button";
import { NumberInput } from "@/features/core/components/NumberInput";
import {
  addTask,
  deleteTask,
  finalizeToday,
  reorderTasks,
  setGamingLimit,
  setGamingMinutes,
  setSocialMediaLimit,
  setSocialMediaMinutes,
  toggleHabitLog,
  updateTask,
} from "@/features/monk/actions/today";
import { StudyItemAddModal } from "@/features/monk/components/today/StudyItemAddModal";
import { scoreDay } from "@/features/monk/lib/accountability";
import { formatHabitTarget } from "@/features/monk/lib/format";
import type { ActionResult, TodayPageData } from "@/features/monk/types";
import type { StudyPlanItem } from "@/lib/supabase/monk-types";

type ChecklistProps = Extract<TodayPageData, { mode: "today" }>;

type MinutesDraft = {
  dayId: string;
  actualMinutes: number | null;
  limitMinutes: number;
};

function resolveMinutesDraft(
  dayId: string,
  stored: { actualMinutes: number | null; limitMinutes: number },
  draft: MinutesDraft | null,
): { actualMinutes: number | null; limitMinutes: number } {
  if (draft?.dayId === dayId) {
    return {
      actualMinutes: draft.actualMinutes,
      limitMinutes: draft.limitMinutes,
    };
  }
  return stored;
}

function FastingChannel({
  title,
  actualMinutes,
  limitMinutes,
  passed,
  locked,
  isPending,
  onActualChange,
  onLimitChange,
}: {
  title: string;
  actualMinutes: number | null;
  limitMinutes: number;
  passed: boolean;
  locked: boolean;
  isPending: boolean;
  onActualChange: (value: number | null) => void;
  onLimitChange: (value: number) => void;
}) {
  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${
            passed ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {passed ? "Within limit" : actualMinutes === null ? "Not logged" : "Over limit"}
        </p>
      </div>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-500">Target</dt>
          <dd className="font-semibold">≤ {limitMinutes} min</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Actual</dt>
          <dd className="font-semibold tabular-nums">
            {actualMinutes === null ? "Not logged" : `${actualMinutes} min`}
          </dd>
        </div>
      </dl>
      {locked ? null : (
        <div className="mt-3 space-y-3">
          <NumberInput
            label="Actual"
            unit="min"
            min={0}
            max={1440}
            allowNull
            disabled={isPending}
            value={actualMinutes}
            onChange={onActualChange}
          />
          <NumberInput
            label="Limit"
            unit="min"
            min={0}
            max={1440}
            disabled={isPending}
            value={limitMinutes}
            onChange={(value) => {
              if (value === null) return;
              onLimitChange(value);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ReflectionField({
  label,
  value,
  onChange,
  locked,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  locked: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {locked ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {value.trim() ? value : "—"}
        </p>
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="mt-1 min-h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base leading-relaxed text-zinc-100 outline-none focus:border-emerald-500"
        />
      )}
    </label>
  );
}

function runResult(
  result: ActionResult,
  setError: (value: string | null) => void,
  refresh: () => void,
) {
  if ("error" in result) {
    setError(result.error);
    return;
  }
  setError(null);
  refresh();
}

export function TodayChecklist(data: ChecklistProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newTaskMandatory, setNewTaskMandatory] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [socialMediaDraft, setSocialMediaDraft] = useState<MinutesDraft | null>(
    null,
  );
  const [gamingDraft, setGamingDraft] = useState<MinutesDraft | null>(null);
  const [accomplished, setAccomplished] = useState(data.day.accomplished ?? "");
  const [failedToDo, setFailedToDo] = useState(data.day.failed_to_do ?? "");
  const [whyFailed, setWhyFailed] = useState(data.day.why_failed ?? "");
  const [improveTomorrow, setImproveTomorrow] = useState(
    data.day.improve_tomorrow ?? "",
  );
  const [selectedStudyItem, setSelectedStudyItem] = useState<StudyPlanItem | null>(
    null,
  );

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
        habits: data.habits,
        tasks: data.tasks,
        socialMediaLimitMinutes: socialMedia.limitMinutes,
        socialMediaActualMinutes: socialMedia.actualMinutes,
        gamingLimitMinutes: gaming.limitMinutes,
        gamingActualMinutes: gaming.actualMinutes,
        maxMandatoryFailuresAllowed: data.challenge.max_mandatory_failures_allowed,
      }),
    [
      data.habits,
      data.tasks,
      socialMedia.limitMinutes,
      socialMedia.actualMinutes,
      gaming.limitMinutes,
      gaming.actualMinutes,
      data.challenge.max_mandatory_failures_allowed,
    ],
  );

  const locked = data.isLocked;
  const refresh = () => router.refresh();

  function act(fn: () => Promise<ActionResult>) {
    startTransition(async () => {
      runResult(await fn(), setError, refresh);
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

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Habits
          </h2>
          <p className="text-xs text-zinc-500">Recurring · snapshot today</p>
        </div>
        {data.habits.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No active habits. Add them on the Habits tab.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.habits.map((habit) => {
              const target = formatHabitTarget(
                habit.target_value_snapshot,
                habit.target_unit_snapshot,
              );
              return (
                <li key={habit.id}>
                  <button
                    type="button"
                    disabled={locked || isPending}
                    onClick={() => act(() => toggleHabitLog(habit.id, !habit.is_completed))}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors disabled:opacity-50 ${
                      habit.is_completed
                        ? "border-emerald-800/80 bg-emerald-950/30"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                        habit.is_completed
                          ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                          : "border-zinc-600"
                      }`}
                    >
                      {habit.is_completed ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-zinc-100">
                        {habit.name}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {habit.is_mandatory_snapshot ? "Mandatory" : "Optional"}
                        {target ? ` · ${target}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Today&apos;s tasks
        </h2>
        {data.tasks.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No tasks yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.tasks.map((task, index) => (
              <li
                key={task.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
              >
                {editingTaskId === task.id ? (
                  <div className="space-y-2">
                    <input
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base outline-none focus:border-emerald-500"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        disabled={locked || isPending}
                        onClick={() =>
                          act(async () => {
                            const result = await updateTask({
                              taskId: task.id,
                              title: editingTitle,
                            });
                            if (!("error" in result)) {
                              setEditingTaskId(null);
                            }
                            return result;
                          })
                        }
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setEditingTaskId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      disabled={locked || isPending}
                      onClick={() =>
                        act(() =>
                          updateTask({
                            taskId: task.id,
                            isCompleted: !task.is_completed,
                          }),
                        )
                      }
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                        task.is_completed
                          ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                          : "border-zinc-600"
                      }`}
                    >
                      {task.is_completed ? "✓" : ""}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-medium ${
                          task.is_completed ? "text-zinc-400 line-through" : "text-zinc-100"
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {task.is_mandatory ? "Mandatory" : "Optional"}
                      </p>
                    </div>
                    {locked ? null : (
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          disabled={index === 0 || isPending}
                          aria-label="Move up"
                          onClick={() => {
                            const ids = data.tasks.map((item) => item.id);
                            const next = [...ids];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            act(() => reorderTasks(data.day.id, next));
                          }}
                          className="text-xs text-zinc-500 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === data.tasks.length - 1 || isPending}
                          aria-label="Move down"
                          onClick={() => {
                            const ids = data.tasks.map((item) => item.id);
                            const next = [...ids];
                            [next[index + 1], next[index]] = [next[index], next[index + 1]];
                            act(() => reorderTasks(data.day.id, next));
                          }}
                          className="text-xs text-zinc-500 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {locked || editingTaskId === task.id ? null : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      className="min-h-10 px-3 text-xs"
                      onClick={() =>
                        act(() =>
                          updateTask({
                            taskId: task.id,
                            isMandatory: !task.is_mandatory,
                          }),
                        )
                      }
                    >
                      {task.is_mandatory ? "Make optional" : "Make mandatory"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-10 px-3 text-xs"
                      onClick={() => {
                        setEditingTaskId(task.id);
                        setEditingTitle(task.title);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-10 px-3 text-xs text-red-400"
                      onClick={() => act(() => deleteTask(task.id))}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {locked ? null : (
          <div className="mt-4 space-y-2">
            <input
              value={newTask}
              placeholder="Add a task for today"
              onChange={(event) => setNewTask(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base outline-none focus:border-emerald-500"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={newTaskMandatory}
                onChange={(event) => setNewTaskMandatory(event.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Mandatory
            </label>
            <Button
              fullWidth
              variant="secondary"
              disabled={isPending || newTask.trim().length === 0}
              onClick={() =>
                act(async () => {
                  const result = await addTask({
                    dayId: data.day.id,
                    title: newTask,
                    isMandatory: newTaskMandatory,
                  });
                  if (!("error" in result)) {
                    setNewTask("");
                    setNewTaskMandatory(false);
                  }
                  return result;
                })
              }
            >
              Add task
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Digital fasting
        </h2>
        <p
          className={`mt-3 text-sm font-semibold uppercase tracking-widest ${
            liveScore.digitalFastingPassed ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {liveScore.digitalFastingPassed ? "Passed" : "Failed"}
        </p>
        <FastingChannel
          title="Social media"
          actualMinutes={socialMedia.actualMinutes}
          limitMinutes={socialMedia.limitMinutes}
          passed={liveScore.socialMediaPassed}
          locked={locked}
          isPending={isPending}
          onActualChange={(value) => {
            setSocialMediaDraft({
              dayId: data.day.id,
              actualMinutes: value,
              limitMinutes: socialMedia.limitMinutes,
            });
            act(() => setSocialMediaMinutes(data.day.id, value));
          }}
          onLimitChange={(value) => {
            setSocialMediaDraft({
              dayId: data.day.id,
              actualMinutes: socialMedia.actualMinutes,
              limitMinutes: value,
            });
            act(() => setSocialMediaLimit(data.day.id, value));
          }}
        />
        <FastingChannel
          title="Games"
          actualMinutes={gaming.actualMinutes}
          limitMinutes={gaming.limitMinutes}
          passed={liveScore.gamingPassed}
          locked={locked}
          isPending={isPending}
          onActualChange={(value) => {
            setGamingDraft({
              dayId: data.day.id,
              actualMinutes: value,
              limitMinutes: gaming.limitMinutes,
            });
            act(() => setGamingMinutes(data.day.id, value));
          }}
          onLimitChange={(value) => {
            setGamingDraft({
              dayId: data.day.id,
              actualMinutes: gaming.actualMinutes,
              limitMinutes: value,
            });
            act(() => setGamingLimit(data.day.id, value));
          }}
        />
      </section>

      {data.studyWeek ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Study plan
          </p>
          {data.studyWeek.completed ? (
            <>
              <h2 className="mt-2 text-lg font-semibold">Plan complete</h2>
              <p className="mt-1 text-sm text-zinc-400">
                The 6-week curriculum is finished. It does not reset with Monk
                Mode.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-lg font-semibold">
                Week {data.studyWeek.weekNumber} / {data.studyWeek.totalWeeks}
              </h2>
              <p className="mt-1 font-medium text-zinc-200">{data.studyWeek.title}</p>
              {data.studyWeek.focus ? (
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {data.studyWeek.focus}
                </p>
              ) : null}
              {data.studyWeek.buildTarget ? (
                <p className="mt-2 text-sm text-zinc-300">
                  Build: {data.studyWeek.buildTarget}
                </p>
              ) : null}
              {data.studyWeek.items.length > 0 && !locked ? (
                <ul className="mt-4 space-y-2">
                  {data.studyWeek.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          {item.kind}
                          {item.is_primary ? " · primary" : ""}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        className="min-h-10 shrink-0 px-3 text-xs"
                        disabled={isPending}
                        onClick={() => setSelectedStudyItem(item)}
                      >
                        Add
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {selectedStudyItem ? (
        <StudyItemAddModal
          dayId={data.day.id}
          item={selectedStudyItem}
          onClose={() => setSelectedStudyItem(null)}
          onAdded={(result) => {
            setSelectedStudyItem(null);
            runResult(result, setError, refresh);
          }}
        />
      ) : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          End-of-day reflection
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Optional. Does not affect pass or fail.
        </p>
        <div className="mt-4 space-y-4">
          <ReflectionField
            label="What did I accomplish?"
            value={locked ? (data.day.accomplished ?? "") : accomplished}
            onChange={setAccomplished}
            locked={locked}
          />
          <ReflectionField
            label="What did I fail to do?"
            value={locked ? (data.day.failed_to_do ?? "") : failedToDo}
            onChange={setFailedToDo}
            locked={locked}
          />
          <ReflectionField
            label="Why?"
            value={locked ? (data.day.why_failed ?? "") : whyFailed}
            onChange={setWhyFailed}
            locked={locked}
          />
          <ReflectionField
            label="What will I improve tomorrow?"
            value={locked ? (data.day.improve_tomorrow ?? "") : improveTomorrow}
            onChange={setImproveTomorrow}
            locked={locked}
          />
        </div>
      </section>

      {locked ? (
        <p className="text-center text-xs text-zinc-500">
          This day is locked. Casual edits are not allowed.
        </p>
      ) : confirmFinalize ? (
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
                  const result = await finalizeToday(data.day.id, {
                    accomplished,
                    failedToDo,
                    whyFailed,
                    improveTomorrow,
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
      ) : (
        <Button fullWidth onClick={() => setConfirmFinalize(true)}>
          Finalize day · {liveScore.passed ? "on track to pass" : "will fail"}
        </Button>
      )}
    </div>
  );
}
