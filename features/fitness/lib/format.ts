import type { SetCategory } from "@/lib/supabase/types";

export const SET_CATEGORY_LABELS: Record<SetCategory, string> = {
  warmup: "Warm-up",
  top_set: "Top set",
  working_set: "Normal",
  back_off: "Back-off",
  zone_2: "Zone 2",
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function formatSetCategory(category: string): string {
  return SET_CATEGORY_LABELS[category as SetCategory] ?? category;
}

/** Manual format avoids SSR/client locale mismatches from toLocaleDateString. */
export function formatHistoryDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatCalendarDateLabel(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatMonthShort(dateStr: string): string {
  return MONTHS[parseLocalDate(dateStr).getMonth()];
}
