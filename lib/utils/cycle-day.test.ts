import { describe, expect, it } from "vitest";

import { nextCycleDay } from "./cycle-day";

describe("nextCycleDay", () => {
  it("starts the cycle at day 1 when there is no previous workout", () => {
    expect(nextCycleDay(null)).toBe(1);
    expect(nextCycleDay(undefined)).toBe(1);
  });

  it("advances one program day at a time", () => {
    expect(nextCycleDay(1)).toBe(2);
    expect(nextCycleDay(5)).toBe(6);
    expect(nextCycleDay(13)).toBe(14);
  });

  it("wraps from day 14 back to day 1", () => {
    expect(nextCycleDay(14)).toBe(1);
  });
});
