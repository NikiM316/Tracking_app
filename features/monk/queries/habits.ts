import "server-only";

import { ensureSettings, listHabits } from "@/features/monk/lib/challenge-ops";
import type { HabitPageData } from "@/features/monk/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";

export async function getHabitsPageData(): Promise<HabitPageData> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  await ensureSettings(supabase, userId);
  const habits = await listHabits(supabase, userId);
  return { habits };
}
