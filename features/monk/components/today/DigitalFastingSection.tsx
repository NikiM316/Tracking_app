"use client";

import { NumberInput } from "@/features/core/components/NumberInput";
import type { DayScore } from "@/features/monk/lib/accountability";

import type { MinutesChannel } from "./checklist-shared";

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

type DigitalFastingSectionProps = {
  liveScore: DayScore;
  socialMedia: MinutesChannel;
  gaming: MinutesChannel;
  locked: boolean;
  isPending: boolean;
  onSocialMediaActualChange: (value: number | null) => void;
  onSocialMediaLimitChange: (value: number) => void;
  onGamingActualChange: (value: number | null) => void;
  onGamingLimitChange: (value: number) => void;
};

export function DigitalFastingSection({
  liveScore,
  socialMedia,
  gaming,
  locked,
  isPending,
  onSocialMediaActualChange,
  onSocialMediaLimitChange,
  onGamingActualChange,
  onGamingLimitChange,
}: DigitalFastingSectionProps) {
  return (
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
        onActualChange={onSocialMediaActualChange}
        onLimitChange={onSocialMediaLimitChange}
      />
      <FastingChannel
        title="Games"
        actualMinutes={gaming.actualMinutes}
        limitMinutes={gaming.limitMinutes}
        passed={liveScore.gamingPassed}
        locked={locked}
        isPending={isPending}
        onActualChange={onGamingActualChange}
        onLimitChange={onGamingLimitChange}
      />
    </section>
  );
}
