/** Calendar timezone for fitness, finance, and Monk Mode day boundaries. */
export const APP_TIMEZONE = "Europe/Sofia";

/**
 * Today's date as `YYYY-MM-DD` in `timeZone`.
 * Do not use `toISOString().slice(0, 10)` for this: UTC midnight is several
 * hours behind Europe/Sofia, so a late-night check would land on yesterday.
 */
export function getTodayInTimezone(timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formats a UTC calendar-date Date. Not a substitute for getTodayInTimezone. */
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso).getTime();
  const end = parseIsoDate(endIso).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function eachDateInclusive(startIso: string, endIso: string): string[] {
  if (startIso > endIso) return [];

  const dates: string[] = [];
  let cursor = startIso;
  while (cursor <= endIso) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}
