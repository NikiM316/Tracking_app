import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addDays,
  compareIsoDates,
  dateForDayNumber,
  dayNumberForDate,
  daysBetween,
  eachDateInclusive,
  formatIsoDate,
  getTodayInTimezone,
  getYesterdayInTimezone,
  isIsoDate,
  maxIsoDate,
  minIsoDate,
  MONK_TIMEZONE,
  parseIsoDate,
} from "./dates";

afterEach(() => {
  vi.useRealTimers();
});

describe("isIsoDate", () => {
  it("accepts a well-formed date", () => {
    expect(isIsoDate("2026-09-02")).toBe(true);
  });

  it("rejects malformed and empty input", () => {
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate("2026-9-2")).toBe(false);
    expect(isIsoDate("02/09/2026")).toBe(false);
    expect(isIsoDate("2026-09-02T00:00:00Z")).toBe(false);
  });
});

describe("parseIsoDate / formatIsoDate", () => {
  it("round-trips a date through UTC without drifting", () => {
    expect(formatIsoDate(parseIsoDate("2026-09-02"))).toBe("2026-09-02");
  });

  it("parses at UTC midnight rather than local midnight", () => {
    // Local-midnight parsing is what causes off-by-one-day bugs for anyone
    // west of UTC, so pin the exact instant.
    expect(parseIsoDate("2026-09-02").toISOString()).toBe(
      "2026-09-02T00:00:00.000Z",
    );
  });
});

describe("addDays", () => {
  it("adds and subtracts days", () => {
    expect(addDays("2026-09-02", 1)).toBe("2026-09-03");
    expect(addDays("2026-09-02", -1)).toBe("2026-09-01");
    expect(addDays("2026-09-02", 0)).toBe("2026-09-02");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("handles leap and non-leap Februaries", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("survives a 180-day span, the full challenge length", () => {
    expect(addDays("2026-01-01", 179)).toBe("2026-06-29");
  });

  it("is unaffected by a DST transition in the middle of the range", () => {
    // Europe/Sofia springs forward on 2026-03-29. UTC-based arithmetic must
    // not lose or gain a day across it.
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });
});

describe("daysBetween", () => {
  it("counts forward, backward, and zero spans", () => {
    expect(daysBetween("2026-09-02", "2026-09-05")).toBe(3);
    expect(daysBetween("2026-09-05", "2026-09-02")).toBe(-3);
    expect(daysBetween("2026-09-02", "2026-09-02")).toBe(0);
  });

  it("rounds across a DST boundary instead of truncating to 1.96 days", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("dayNumberForDate / dateForDayNumber", () => {
  it("treats the start date as day 1, not day 0", () => {
    expect(dayNumberForDate("2026-01-01", "2026-01-01")).toBe(1);
    expect(dateForDayNumber("2026-01-01", 1)).toBe("2026-01-01");
  });

  it("maps the final day of a 180-day challenge", () => {
    const day180 = dateForDayNumber("2026-01-01", 180);
    expect(day180).toBe("2026-06-29");
    expect(dayNumberForDate("2026-01-01", day180)).toBe(180);
  });

  it("returns a non-positive number for dates before the start", () => {
    expect(dayNumberForDate("2026-01-02", "2026-01-01")).toBe(0);
  });

  it("is the inverse of dateForDayNumber across a DST change", () => {
    for (const dayNumber of [1, 87, 88, 89, 180]) {
      const date = dateForDayNumber("2026-01-01", dayNumber);
      expect(dayNumberForDate("2026-01-01", date)).toBe(dayNumber);
    }
  });
});

describe("comparison helpers", () => {
  it("orders dates lexicographically", () => {
    expect(compareIsoDates("2026-09-02", "2026-09-02")).toBe(0);
    expect(compareIsoDates("2026-09-01", "2026-09-02")).toBe(-1);
    expect(compareIsoDates("2026-09-03", "2026-09-02")).toBe(1);
  });

  it("picks the min and max", () => {
    expect(minIsoDate("2026-09-01", "2026-09-02")).toBe("2026-09-01");
    expect(minIsoDate("2026-09-02", "2026-09-01")).toBe("2026-09-01");
    expect(maxIsoDate("2026-09-01", "2026-09-02")).toBe("2026-09-02");
    expect(maxIsoDate("2026-09-02", "2026-09-02")).toBe("2026-09-02");
  });
});

describe("eachDateInclusive", () => {
  it("includes both endpoints", () => {
    expect(eachDateInclusive("2026-09-01", "2026-09-03")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
  });

  it("returns a single date when start equals end", () => {
    expect(eachDateInclusive("2026-09-01", "2026-09-01")).toEqual([
      "2026-09-01",
    ]);
  });

  it("returns empty when the range is inverted, rather than looping forever", () => {
    expect(eachDateInclusive("2026-09-03", "2026-09-01")).toEqual([]);
  });

  it("produces exactly 180 dates for a full challenge", () => {
    const dates = eachDateInclusive("2026-01-01", "2026-06-29");
    expect(dates).toHaveLength(180);
    expect(dates.at(-1)).toBe("2026-06-29");
  });
});

describe("getTodayInTimezone", () => {
  it("defaults to the monk timezone", () => {
    expect(MONK_TIMEZONE).toBe("Europe/Sofia");
    expect(getTodayInTimezone()).toBe(getTodayInTimezone(MONK_TIMEZONE));
  });

  it("returns tomorrow's date in Sofia when it is still yesterday in UTC", () => {
    // 22:30 UTC is 01:30 the next day in Sofia (UTC+3 in summer). This is the
    // rollover that decides which monk day a late-night check-in belongs to.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T22:30:00Z"));

    expect(getTodayInTimezone("Europe/Sofia")).toBe("2026-09-03");
    expect(getTodayInTimezone("UTC")).toBe("2026-09-02");
  });

  it("has not rolled over just before local midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T20:59:00Z"));

    expect(getTodayInTimezone("Europe/Sofia")).toBe("2026-09-02");
  });

  it("rolls over exactly at local midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T21:00:00Z"));

    expect(getTodayInTimezone("Europe/Sofia")).toBe("2026-09-03");
  });

  it("accounts for the winter offset being UTC+2 rather than UTC+3", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T22:30:00Z"));

    expect(getTodayInTimezone("Europe/Sofia")).toBe("2026-01-16");

    vi.setSystemTime(new Date("2026-01-15T21:30:00Z"));
    expect(getTodayInTimezone("Europe/Sofia")).toBe("2026-01-15");
  });

  it("returns a zero-padded ISO date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T12:00:00Z"));

    expect(getTodayInTimezone("Europe/Sofia")).toBe("2026-01-05");
    expect(isIsoDate(getTodayInTimezone("Europe/Sofia"))).toBe(true);
  });
});

describe("getYesterdayInTimezone", () => {
  it("is one day before today in the same timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T12:00:00Z"));

    expect(getYesterdayInTimezone("Europe/Sofia")).toBe("2026-09-01");
  });

  it("follows the local rollover, not the UTC one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T22:30:00Z"));

    expect(getYesterdayInTimezone("Europe/Sofia")).toBe("2026-09-02");
    expect(getYesterdayInTimezone("UTC")).toBe("2026-09-01");
  });

  it("crosses a month boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));

    expect(getYesterdayInTimezone("Europe/Sofia")).toBe("2026-02-28");
  });
});
