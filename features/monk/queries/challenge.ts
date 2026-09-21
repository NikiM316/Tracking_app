import "server-only";

import {
  computeChallengeStreaks,
  MILESTONE_DAYS,
  nextStartDate,
  previousBestStreak,
} from "@/features/monk/lib/accountability";
import {
  ensureSettings,
  listChallenges,
  listDaysForChallenge,
  prepareActiveChallenge,
} from "@/features/monk/lib/challenge-ops";
import {
  dateForDayNumber,
  dayNumberForDate,
  getTodayInTimezone,
} from "@/features/monk/lib/dates";
import type { ChallengeGridCell, ChallengePageData } from "@/features/monk/types";
import type { MonkChallenge, MonkDay } from "@/lib/supabase/monk-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";

function buildGrid(params: {
  challenge: MonkChallenge;
  days: MonkDay[];
  today: string;
}): ChallengeGridCell[] {
  const byNumber = new Map(params.days.map((day) => [day.day_number, day]));
  const milestoneSet = new Set<number>(MILESTONE_DAYS);
  const cells: ChallengeGridCell[] = [];

  for (let dayNumber = 1; dayNumber <= params.challenge.target_days; dayNumber += 1) {
    const date = dateForDayNumber(params.challenge.started_on, dayNumber);
    const day = byNumber.get(dayNumber);
    const isMilestone = milestoneSet.has(dayNumber);

    if (day) {
      cells.push({
        dayNumber,
        date,
        status: day.status,
        isMilestone,
      });
      continue;
    }

    if (params.challenge.status !== "active" && date > (params.challenge.ended_on ?? date)) {
      cells.push({ dayNumber, date, status: "empty", isMilestone });
      continue;
    }

    if (date > params.today) {
      cells.push({ dayNumber, date, status: "future", isMilestone });
      continue;
    }

    if (date === params.today && params.challenge.status === "active") {
      cells.push({ dayNumber, date, status: "in_progress", isMilestone });
      continue;
    }

    cells.push({ dayNumber, date, status: "empty", isMilestone });
  }

  return cells;
}

export async function getChallengePageData(): Promise<ChallengePageData> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const settings = await ensureSettings(supabase, userId);
  const today = getTodayInTimezone(settings.timezone);
  const active = await prepareActiveChallenge(supabase, userId, settings);
  const attempts = await listChallenges(supabase, userId);
  const focusedChallenge = active ?? attempts[0] ?? null;
  const days = focusedChallenge
    ? await listDaysForChallenge(supabase, focusedChallenge.id)
    : [];

  const latestClosed = attempts.find((attempt) => attempt.status !== "active") ?? null;
  const resetRequired =
    !active && latestClosed && latestClosed.status !== "completed"
      ? {
          challenge: latestClosed,
          canStartOn: nextStartDate({
            today,
            lastEndedOn: latestClosed.ended_on,
          }),
          canStartNow:
            today >=
            nextStartDate({ today, lastEndedOn: latestClosed.ended_on }),
        }
      : null;

  return {
    settings,
    activeChallenge: active,
    focusedChallenge,
    days,
    cells: focusedChallenge
      ? buildGrid({ challenge: focusedChallenge, days, today })
      : [],
    streaks: focusedChallenge
      ? computeChallengeStreaks({
          challenge: focusedChallenge,
          days,
          todayDayNumber: active
            ? Math.max(
                1,
                Math.min(
                  focusedChallenge.target_days,
                  dayNumberForDate(focusedChallenge.started_on, today),
                ),
              )
            : (focusedChallenge.ended_day_number ??
              focusedChallenge.successful_days_count),
          previousBest: previousBestStreak(attempts),
        })
      : null,
    attempts,
    resetRequired,
  };
}
