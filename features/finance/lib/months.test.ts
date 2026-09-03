import { afterEach, describe, expect, it, vi } from "vitest";

import {
  calendarMonth,
  calendarMonthBefore,
  calendarMonthContaining,
  currentCalendarMonth,
  FINANCE_TIMEZONE,
  formatMonthLabel,
  previousCalendarMonth,
  todayInFinanceTimezone,
} from "./months";

afterEach(() => {
  vi.useRealTimers();
});

describe("calendarMonth", () => {
  it("uses the first and last days of a 30-day month", () => {
    expect(calendarMonth(2026, 9)).toEqual({
      year: 2026,
      month: 9,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
  });

  it("uses the last day of January and a non-leap February", () => {
    expect(calendarMonth(2026, 1).endDate).toBe("2026-01-31");
    expect(calendarMonth(2026, 2).endDate).toBe("2026-02-28");
  });

  it("includes 29 February in a leap year", () => {
    expect(calendarMonth(2028, 2).endDate).toBe("2028-02-29");
  });

  it("rejects a month outside 1–12", () => {
    expect(() => calendarMonth(2026, 0)).toThrow(/Invalid calendar month/);
    expect(() => calendarMonth(2026, 13)).toThrow(/Invalid calendar month/);
  });
});

describe("calendarMonthContaining", () => {
  it("returns the month that owns the date", () => {
    expect(calendarMonthContaining("2026-09-03")).toEqual(calendarMonth(2026, 9));
    expect(calendarMonthContaining("2026-09-01")).toEqual(calendarMonth(2026, 9));
    expect(calendarMonthContaining("2026-09-30")).toEqual(calendarMonth(2026, 9));
  });

  it("rejects a non-ISO date", () => {
    expect(() => calendarMonthContaining("2026-9-3")).toThrow(/YYYY-MM-DD/);
  });
});

describe("currentCalendarMonth", () => {
  it("uses Europe/Sofia by default", () => {
    expect(FINANCE_TIMEZONE).toBe("Europe/Sofia");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T10:00:00Z"));

    expect(currentCalendarMonth()).toEqual(calendarMonth(2026, 9));
    expect(todayInFinanceTimezone()).toBe("2026-09-03");
  });

  it("rolls to the next month at Sofia midnight, not UTC midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T21:30:00Z"));

    expect(currentCalendarMonth("Europe/Sofia")).toEqual(calendarMonth(2026, 9));
    expect(currentCalendarMonth("UTC")).toEqual(calendarMonth(2026, 8));
  });
});

describe("previousCalendarMonth", () => {
  it("steps back one month", () => {
    expect(previousCalendarMonth(calendarMonth(2026, 9))).toEqual(calendarMonth(2026, 8));
  });

  it("crosses the year boundary", () => {
    expect(previousCalendarMonth(calendarMonth(2026, 1))).toEqual(calendarMonth(2025, 12));
  });
});

describe("calendarMonthBefore", () => {
  it("uses the month that contains the date, then steps back one", () => {
    expect(calendarMonthBefore("2026-09-03")).toEqual(calendarMonth(2026, 8));
    expect(calendarMonthBefore("2026-09-01")).toEqual(calendarMonth(2026, 8));
    expect(calendarMonthBefore("2026-01-15")).toEqual(calendarMonth(2025, 12));
  });
});

describe("formatMonthLabel", () => {
  it("names the month without shifting across a timezone boundary", () => {
    expect(formatMonthLabel(calendarMonth(2026, 9), "en-GB")).toBe("September 2026");
    expect(formatMonthLabel(calendarMonth(2026, 1), "en-GB")).toBe("January 2026");
  });
});
