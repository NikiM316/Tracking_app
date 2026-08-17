import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Workout } from "@/lib/supabase/types";
import { PLACEHOLDER_USER_ID } from "@/lib/utils/placeholder-user";

const CYCLE_LENGTH = 14;
const TRANSIENT_QUERY_ATTEMPTS = 4;
const TRANSIENT_QUERY_BASE_DELAY_MS = 250;
const TRANSIENT_ERROR_PATTERN =
  /JWT issued at future|fetch failed|Failed to fetch|network|timeout|ECONNRESET|ETIMEDOUT|503|502|429/i;

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

export function getPlaceholderUserId(): string {
  return process.env.PLACEHOLDER_USER_ID ?? PLACEHOLDER_USER_ID;
}

export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function isTransientError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_ERROR_PATTERN.test(message);
}

async function withTransientRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < TRANSIENT_QUERY_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry =
        isTransientError(error) && attempt < TRANSIENT_QUERY_ATTEMPTS - 1;
      if (!canRetry) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, TRANSIENT_QUERY_BASE_DELAY_MS * 2 ** attempt),
      );
    }
  }

  throw lastError;
}

async function fetchWorkoutForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<Workout | null> {
  return withTransientRetry(async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      throw new Error(`Failed to fetch workout for ${date}: ${error.message}`);
    }

    return data?.[0] ?? null;
  });
}

/**
 * The cycle sequence is driven by logged history rather than calendar math, so
 * a manual day override on one workout carries forward to the following days.
 */
async function getNextCycleDayBefore(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<number> {
  return withTransientRetry(async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("cycle_day")
      .eq("user_id", userId)
      .lt("date", date)
      .order("date", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to fetch previous workout: ${error.message}`);
    }

    const previous = data?.[0];
    if (!previous) {
      return 1;
    }

    return (previous.cycle_day % CYCLE_LENGTH) + 1;
  });
}

/**
 * Cached per request so the layout and page resolve (and create) the same row.
 */
export const getOrCreateTodayWorkout = cache(async (): Promise<Workout> => {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const today = getTodayDateString();

  const existing = await fetchWorkoutForDate(supabase, userId, today);
  if (existing) {
    return existing;
  }

  const cycleDay = await getNextCycleDayBefore(supabase, userId, today);

  try {
    return await withTransientRetry(async () => {
      const { data: created, error } = await supabase
        .from("workouts")
        .insert({
          user_id: userId,
          cycle_day: cycleDay,
          date: today,
        })
        .select("*")
        .single();

      if (error || !created) {
        throw new Error(
          `Failed to create today's workout: ${error?.message ?? "unknown error"}`,
        );
      }

      return created;
    });
  } catch (insertError) {
    const raced = await fetchWorkoutForDate(supabase, userId, today);
    if (raced) {
      return raced;
    }
    throw insertError;
  }
});
