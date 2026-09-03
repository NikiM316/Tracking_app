"use client";

import { useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { fetchHistoricalMonth } from "@/features/finance/actions";
import { MonthlyActivitySection } from "@/features/finance/components/dashboard/MonthlyActivitySection";
import type { MonthActivity } from "@/features/finance/lib/activity";
import type { FinanceCategory } from "@/lib/supabase/finance-types";

type MonthlyActivityFeedProps = {
  initialActivity: MonthActivity;
  categories: FinanceCategory[];
};

export function MonthlyActivityFeed({
  initialActivity,
  categories,
}: MonthlyActivityFeedProps) {
  const [loadedMonths, setLoadedMonths] = useState<MonthActivity[]>([initialActivity]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLoadPrevious() {
    const oldest = loadedMonths[loadedMonths.length - 1];
    if (!oldest) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const previous = await fetchHistoricalMonth(oldest.month.startDate);
        setLoadedMonths((current) => {
          if (current.some((month) => month.month.startDate === previous.month.startDate)) {
            return current;
          }
          return [...current, previous];
        });
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Failed to load the previous month.",
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      {loadedMonths.map((activity, index) => (
        <MonthlyActivitySection
          key={activity.month.startDate}
          activity={activity}
          categories={categories}
          showActions={index === 0}
        />
      ))}

      <div className="space-y-2">
        <Button
          variant="secondary"
          fullWidth
          disabled={isPending}
          aria-busy={isPending}
          onClick={handleLoadPrevious}
        >
          {isPending ? "Loading previous month..." : "Load previous month"}
        </Button>
        {error ? (
          <p className="text-center text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
