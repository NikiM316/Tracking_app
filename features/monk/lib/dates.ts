export const MONK_TIMEZONE = "Europe/Sofia";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value);
}

export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

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

export function getTodayInTimezone(timeZone: string = MONK_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getYesterdayInTimezone(timeZone: string = MONK_TIMEZONE): string {
  return addDays(getTodayInTimezone(timeZone), -1);
}

export function compareIsoDates(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function minIsoDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxIsoDate(a: string, b: string): string {
  return a >= b ? a : b;
}

export function dayNumberForDate(startedOn: string, date: string): number {
  return daysBetween(startedOn, date) + 1;
}

export function dateForDayNumber(startedOn: string, dayNumber: number): string {
  return addDays(startedOn, dayNumber - 1);
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
