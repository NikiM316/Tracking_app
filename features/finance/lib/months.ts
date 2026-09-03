import { ISO_DATE_PATTERN } from "@/features/finance/utils";

/**
 * Calendar months follow the same timezone as Monk Mode so a late-night
 * check on the 1st is not still "last month" just because UTC has not rolled.
 */
export const FINANCE_TIMEZONE = "Europe/Sofia";

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type CalendarMonth = DateRange & {
  year: number;
  /** 1–12 */
  month: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function calendarMonth(year: number, month: number): CalendarMonth {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid calendar month: ${year}-${month}`);
  }

  return {
    year,
    month,
    startDate: `${year}-${pad2(month)}-01`,
    endDate: `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`,
  };
}

export function calendarMonthContaining(isoDate: string): CalendarMonth {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new Error(`Date must be YYYY-MM-DD: ${isoDate}`);
  }

  const [year, month] = isoDate.split("-").map(Number);
  return calendarMonth(year, month);
}

export function todayInFinanceTimezone(timeZone: string = FINANCE_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentCalendarMonth(timeZone: string = FINANCE_TIMEZONE): CalendarMonth {
  return calendarMonthContaining(todayInFinanceTimezone(timeZone));
}

export function previousCalendarMonth(month: CalendarMonth): CalendarMonth {
  if (month.month === 1) {
    return calendarMonth(month.year - 1, 12);
  }
  return calendarMonth(month.year, month.month - 1);
}

/** The calendar month immediately before the month that contains `isoDate`. */
export function calendarMonthBefore(isoDate: string): CalendarMonth {
  return previousCalendarMonth(calendarMonthContaining(isoDate));
}

export function formatMonthLabel(
  month: CalendarMonth,
  locales?: string | string[],
): string {
  return new Intl.DateTimeFormat(locales, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
}
