const MONTHS = [
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

export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatHabitTarget(
  value: number | string | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (value === null || value === undefined || unit === null || unit === undefined) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const trimmedUnit = unit.trim();
  if (!trimmedUnit) {
    return String(numeric);
  }

  return `${numeric} ${trimmedUnit}`;
}
