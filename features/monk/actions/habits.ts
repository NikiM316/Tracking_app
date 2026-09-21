"use server";

import { revalidatePath } from "next/cache";

import { listHabits, revalidateMonkPaths } from "@/features/monk/lib/challenge-ops";
import type { ActionResult } from "@/features/monk/types";
import {
  createHabitSchema,
  reorderHabitsSchema,
  updateHabitSchema,
} from "@/features/monk/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { parseActionInput } from "@/lib/validation";

function touchMonkPaths() {
  for (const path of revalidateMonkPaths()) {
    revalidatePath(path);
  }
}

export async function createHabit(input: {
  name: string;
  isMandatory: boolean;
  targetValue: number | null;
  targetUnit: string | null;
}): Promise<ActionResult> {
  const parsed = parseActionInput(createHabitSchema, input);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();
  const habits = await listHabits(supabase, userId);
  const nextOrder =
    habits.reduce((max, habit) => Math.max(max, habit.sort_order), -1) + 1;

  const { error } = await supabase.from("monk_habits").insert({
    user_id: userId,
    name: parsed.data.name,
    is_mandatory: parsed.data.isMandatory,
    target_value: parsed.data.targetValue,
    target_unit: parsed.data.targetUnit,
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
  const parsed = parseActionInput(updateHabitSchema, input);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const patch: {
    name?: string;
    is_mandatory?: boolean;
    is_active?: boolean;
    target_value?: number | null;
    target_unit?: string | null;
  } = {};

  if (parsed.data.name !== undefined) {
    patch.name = parsed.data.name;
  }

  if (parsed.data.isMandatory !== undefined) {
    patch.is_mandatory = parsed.data.isMandatory;
  }

  if (parsed.data.isActive !== undefined) {
    patch.is_active = parsed.data.isActive;
  }

  if (parsed.data.targetValue !== undefined) {
    patch.target_value = parsed.data.targetValue;
  }

  if (parsed.data.targetUnit !== undefined) {
    patch.target_unit = parsed.data.targetUnit;
  }

  const { error } = await supabase
    .from("monk_habits")
    .update(patch)
    .eq("id", parsed.data.habitId);

  if (error) {
    return { error: error.message };
  }

  touchMonkPaths();
  return { ok: true };
}

export async function reorderHabits(orderedIds: string[]): Promise<ActionResult> {
  const parsed = parseActionInput(reorderHabitsSchema, orderedIds);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const supabase = createServerSupabaseClient();
  const results = await Promise.all(
    parsed.data.map((id, index) =>
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
