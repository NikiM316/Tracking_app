"use server";

import { revalidatePath } from "next/cache";

import {
  ensureSettings,
  getPlaceholderUserId,
  listHabits,
  revalidateMonkPaths,
} from "@/features/monk/lib/challenge-ops";
import type { ActionResult, HabitPageData } from "@/features/monk/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function touchMonkPaths() {
  for (const path of revalidateMonkPaths()) {
    revalidatePath(path);
  }
}

export async function getHabitsPageData(): Promise<HabitPageData> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  await ensureSettings(supabase, userId);
  const habits = await listHabits(supabase, userId);
  return { habits };
}

export async function createHabit(input: {
  name: string;
  isMandatory: boolean;
  targetValue: number | null;
  targetUnit: string | null;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) {
    return { error: "Habit name is required." };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const habits = await listHabits(supabase, userId);
  const nextOrder =
    habits.reduce((max, habit) => Math.max(max, habit.sort_order), -1) + 1;

  const { error } = await supabase.from("monk_habits").insert({
    user_id: userId,
    name,
    is_mandatory: input.isMandatory,
    target_value: input.targetValue,
    target_unit: input.targetUnit?.trim() || null,
    sort_order: nextOrder,
  });

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths();
  return { ok: true };
}

export async function updateHabit(input: {
  habitId: string;
  name?: string;
  isMandatory?: boolean;
  isActive?: boolean;
  targetValue?: number | null;
  targetUnit?: string | null;
}): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const patch: {
    name?: string;
    is_mandatory?: boolean;
    is_active?: boolean;
    target_value?: number | null;
    target_unit?: string | null;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      return { error: "Habit name is required." };
    }
    patch.name = name;
  }

  if (input.isMandatory !== undefined) {
    patch.is_mandatory = input.isMandatory;
  }

  if (input.isActive !== undefined) {
    patch.is_active = input.isActive;
  }

  if (input.targetValue !== undefined) {
    patch.target_value = input.targetValue;
  }

  if (input.targetUnit !== undefined) {
    patch.target_unit = input.targetUnit?.trim() || null;
  }

  const { error } = await supabase
    .from("monk_habits")
    .update(patch)
    .eq("id", input.habitId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths();
  return { ok: true };
}

export async function reorderHabits(orderedIds: string[]): Promise<ActionResult> {
  const supabase = createServerSupabaseClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("monk_habits").update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return { error: failed.error.message };
  }

  touchMonkPaths();
  return { ok: true };
}
