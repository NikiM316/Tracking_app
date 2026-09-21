"use server";

import { revalidatePath } from "next/cache";

import { nextStartDate } from "@/features/monk/lib/accountability";
import {
  ensureSettings,
  listChallenges,
  listHabits,
  prepareActiveChallenge,
  revalidateMonkPaths,
} from "@/features/monk/lib/challenge-ops";
import { getTodayInTimezone } from "@/features/monk/lib/dates";
import type { ActionResult, StartChallengeInput } from "@/features/monk/types";
import { startChallengeSchema } from "@/features/monk/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { parseActionInput } from "@/lib/validation";

function touchMonkPaths() {
  for (const path of revalidateMonkPaths()) {
    revalidatePath(path);
  }
}

export async function startChallenge(
  input: StartChallengeInput,
): Promise<ActionResult> {
  const parsed = parseActionInput(startChallengeSchema, input);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

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

  const limit = Math.round(parsed.data.socialMediaLimitMinutes);

  if (parsed.data.habits) {
    const drafts = parsed.data.habits.filter((habit) => habit.name.length > 0);

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
