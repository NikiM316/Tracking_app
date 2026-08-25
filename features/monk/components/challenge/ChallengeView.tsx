"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/features/core/components/Button";
import { startChallenge } from "@/features/monk/actions/challenge";
import { formatLongDate } from "@/features/monk/lib/format";
import type {
  ChallengeGridCell,
  ChallengePageData,
  ClosedChallengeSummary,
} from "@/features/monk/types";
import type { MonkChallenge } from "@/lib/supabase/monk-types";

const CELL_STYLES: Record<ChallengeGridCell["status"], string> = {
  passed: "bg-emerald-500",
  failed: "bg-red-500",
  in_progress: "border border-amber-500/70 bg-amber-500/20",
  future: "border border-zinc-800 bg-zinc-900",
  empty: "bg-zinc-800/40",
};

const CELL_LABELS: Record<ChallengeGridCell["status"], string> = {
  passed: "Passed",
  failed: "Failed",
  in_progress: "In progress",
  future: "Upcoming",
  empty: "Unused",
};

function AttemptCard({
  attempt,
  isFocused,
}: {
  attempt: MonkChallenge;
  isFocused: boolean;
}) {
  return (
    <article
      className={`rounded-xl border px-4 py-3 ${
        isFocused ? "border-zinc-600 bg-zinc-900" : "border-zinc-800 bg-zinc-950/60"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Challenge #{attempt.attempt_number}
        {attempt.status === "active" ? " · current" : ""}
      </p>
      <p className="mt-1 text-sm text-zinc-300">
        Started {formatLongDate(attempt.started_on)}
      </p>
      {attempt.status === "failed" && attempt.ended_on ? (
        <p className="mt-1 text-sm text-red-400">
          Failed on day {attempt.ended_day_number} · {attempt.successful_days_count}{" "}
          successful days
        </p>
      ) : null}
      {attempt.status === "completed" && attempt.ended_on ? (
        <p className="mt-1 text-sm text-emerald-400">
          Completed {formatLongDate(attempt.ended_on)}
        </p>
      ) : null}
      {attempt.status === "active" ? (
        <p className="mt-1 text-sm text-zinc-400">In progress</p>
      ) : null}
    </article>
  );
}

function ResetBanner({
  summary,
  defaultLimit,
}: {
  summary: ClosedChallengeSummary;
  defaultLimit: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-red-900/80 bg-red-950/40 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
        Challenge failed
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">RESET REQUIRED</h2>
      <p className="mt-2 text-sm text-zinc-300">
        {summary.challenge.successful_days_count} days completed on attempt #
        {summary.challenge.attempt_number}.
      </p>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      <Button
        className="mt-4"
        variant="danger"
        fullWidth
        disabled={!summary.canStartNow || isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startChallenge({
              socialMediaLimitMinutes: defaultLimit,
            });
            if ("error" in result) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {summary.canStartNow
          ? `Start challenge #${summary.challenge.attempt_number + 1}`
          : `Available ${formatLongDate(summary.canStartOn)}`}
      </Button>
    </section>
  );
}

export function ChallengeView(data: ChallengePageData) {
  const [selected, setSelected] = useState<ChallengeGridCell | null>(null);

  const weeks = useMemo(() => {
    const rows: ChallengeGridCell[][] = [];
    for (let i = 0; i < data.cells.length; i += 10) {
      rows.push(data.cells.slice(i, i + 10));
    }
    return rows;
  }, [data.cells]);

  const focused = data.focusedChallenge;
  const streaks = data.streaks;

  if (!focused) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xl font-bold">No challenge yet</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Start from Today. The 180-day grid will appear here.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {data.resetRequired ? (
        <ResetBanner
          summary={data.resetRequired}
          defaultLimit={data.settings.social_media_limit_minutes}
        />
      ) : null}

      {streaks ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Attempt #{focused.attempt_number}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
            DAY {streaks.dayNumber}
            <span className="text-xl font-semibold text-zinc-500">
              {" "}
              / {focused.target_days}
            </span>
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Current streak</dt>
              <dd className="text-lg font-semibold tabular-nums text-emerald-400">
                {streaks.currentStreak}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Best streak</dt>
              <dd className="text-lg font-semibold tabular-nums">{streaks.bestStreak}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Days completed</dt>
              <dd className="font-semibold tabular-nums">{streaks.daysPassed}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Days failed</dt>
              <dd className="font-semibold tabular-nums">{streaks.daysFailed}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          180-day record
        </h2>
        <div className="mt-4 space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1">
              {week.map((cell) => (
                <button
                  key={cell.dayNumber}
                  type="button"
                  aria-label={`Day ${cell.dayNumber}: ${CELL_LABELS[cell.status]}`}
                  onClick={() => setSelected(cell)}
                  className={`h-3.5 flex-1 rounded-[3px] ${CELL_STYLES[cell.status]} ${
                    cell.isMilestone ? "ring-1 ring-zinc-400/70" : ""
                  } ${
                    selected?.dayNumber === cell.dayNumber
                      ? "ring-2 ring-emerald-300 ring-offset-1 ring-offset-zinc-950"
                      : ""
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500" />
            Passed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-red-500" />
            Failed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] border border-amber-500/70 bg-amber-500/20" />
            In progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] ring-1 ring-zinc-400/70 bg-zinc-900" />
            Milestone
          </span>
        </div>
        {selected ? (
          <p className="mt-3 text-sm text-zinc-300">
            Day {selected.dayNumber} · {formatLongDate(selected.date)} ·{" "}
            {CELL_LABELS[selected.status]}
            {selected.isMilestone ? " · milestone" : ""}
          </p>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">Tap a square for the date.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Attempt history
        </h2>
        {data.attempts.length === 0 ? (
          <p className="text-sm text-zinc-500">No attempts recorded.</p>
        ) : (
          data.attempts.map((attempt) => (
            <AttemptCard
              key={attempt.id}
              attempt={attempt}
              isFocused={attempt.id === focused.id}
            />
          ))
        )}
      </section>
    </div>
  );
}
