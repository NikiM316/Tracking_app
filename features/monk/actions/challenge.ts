"use server";

import { revalidatePath } from "next/cache";

import {
  computeChallengeStreaks,
  MILESTONE_DAYS,
  nextStartDate,
  previousBestStreak,
} from "@/features/monk/lib/accountability";
import {
  ensureSettings,
  getPlaceholderUserId,
  listChallenges,
  listDaysForChallenge,
  listHabits,
  prepareActiveChallenge,
  revalidateMonkPaths,
} from "@/features/monk/lib/challenge-ops";
import {
  dateForDayNumber,
  dayNumberForDate,
  getTodayInTimezone,
} from "@/features/monk/lib/dates";
import type {
  ActionResult,
  ChallengeGridCell,
  ChallengePageData,
  StartChallengeInput,
} from "@/features/monk/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MonkChallenge, MonkDay } from "@/lib/supabase/monk-types";

function touchMonkPaths() {
  for (const path of revalidateMonkPaths()) {
    revalidatePath(path);
  }
}

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

export async function startChallenge(
  input: StartChallengeInput,
): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const settings = await ensureSettings(supabase, userId);
  const today = getTodayInTimezone(settings.timezone);

  const existingActive = await prepareActiveChallenge(supabase, userId, settings);
  if (existingActive) {
    return { error: "A challenge is already active." };
  }

  const attempts = await listChallenges(supabase, userId);
  const latest = attempts[0] ?? null;
  const canStartOn = nextStartDate({
    today,
    lastEndedOn: latest?.ended_on ?? null,
  });

  if (today < canStartOn) {
    return {
      error: `The next attempt can start on ${canStartOn}.`,
    };
  }

  const limit = Math.round(input.socialMediaLimitMinutes);
  if (!Number.isFinite(limit) || limit < 0) {
    return { error: "Social-media limit must be zero or more minutes." };
  }

  if (input.habits) {
    const drafts = input.habits
      .map((habit) => ({
        ...habit,
        name: habit.name.trim(),
      }))
      .filter((habit) => habit.name.length > 0);

    if (drafts.length === 0) {
      return { error: "Add at least one habit before starting." };
    }

    const existingHabits = await listHabits(supabase, userId);
    const nextOrder =
      existingHabits.reduce((max, habit) => Math.max(max, habit.sort_order), -1) + 1;

    const { error: habitError } = await supabase.from("monk_habits").insert(
      drafts.map((habit, index) => ({
        user_id: userId,
        name: habit.name,
        is_mandatory: habit.isMandatory,
        target_value: habit.targetValue,
        target_unit: habit.targetUnit,
        sort_order: nextOrder + index,
      })),
    );

    if (habitError) {
      return { error: habitError.message };
    }
  }

  const { error: settingsError } = await supabase
    .from("monk_settings")
    .update({ social_media_limit_minutes: limit })
    .eq("user_id", userId);

  if (settingsError) {
    return { error: settingsError.message };
  }

  const attemptNumber = (latest?.attempt_number ?? 0) + 1;
  const { error: challengeError } = await supabase.from("monk_challenges").insert({
    user_id: userId,
    attempt_number: attemptNumber,
    started_on: today,
    target_days: 180,
    status: "active",
    social_media_limit_minutes: limit,
    max_mandatory_failures_allowed: settings.max_mandatory_failures_allowed,
    reset_rule: settings.reset_rule,
    reset_consecutive_count: settings.reset_consecutive_count,
    reset_window_days: settings.reset_window_days,
    reset_window_fail_count: settings.reset_window_fail_count,
  });

  if (challengeError) {
    return { error: challengeError.message };
  }

  touchMonkPaths();
  return { ok: true };
}
