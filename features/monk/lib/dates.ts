import {
  APP_TIMEZONE,
  addDays,
  daysBetween,
  eachDateInclusive,
  formatIsoDate,
  getTodayInTimezone,
  parseIsoDate,
} from "@/lib/utils/dates";

export const MONK_TIMEZONE = APP_TIMEZONE;

export {
  addDays,
  daysBetween,
  eachDateInclusive,
  formatIsoDate,
  getTodayInTimezone,
  parseIsoDate,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value);
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
