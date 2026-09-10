"use server";

import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FinanceCategory, FinanceCategoryKind } from "@/lib/supabase/finance-types";

/**
 * Fetches every finance category for the current user, including nested
 * subcategories (`parent_id` is not filtered). Optionally limited by kind
 * for expense vs income forms. Ordered by name ascending.
 */
export async function getCategories(
  kind?: FinanceCategoryKind,
): Promise<FinanceCategory[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  let query = supabase
    .from("finance_categories")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (kind) {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data ?? [];
}
