import { describe, expect, it } from "vitest";

import {
  formatCalendarDateLabel,
  formatHistoryDate,
  formatMonthShort,
  formatSetCategory,
} from "./format";

describe("formatSetCategory", () => {
  it("maps known set categories to display labels", () => {
    expect(formatSetCategory("warmup")).toBe("Warm-up");
    expect(formatSetCategory("working_set")).toBe("Normal");
  });

  it("falls back to the raw value for unknown categories", () => {
    expect(formatSetCategory("unknown")).toBe("unknown");
  });
});

describe("date labels", () => {
  it("formats history with weekday, month, day, and year", () => {
    expect(formatHistoryDate("2026-09-10")).toBe("Thu, Sep 10, 2026");
  });

  it("formats calendar labels without the year", () => {
    expect(formatCalendarDateLabel("2026-09-10")).toBe("Thu, Sep 10");
  });

  it("formats a short month name", () => {
    expect(formatMonthShort("2026-09-10")).toBe("Sep");
  });
});
