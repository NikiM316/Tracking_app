import { afterEach, describe, expect, it, vi } from "vitest";

import { APP_TIMEZONE, getTodayInTimezone } from "./dates";

afterEach(() => {
  vi.useRealTimers();
});

describe("getTodayInTimezone", () => {
  it("defaults to Europe/Sofia", () => {
    expect(APP_TIMEZONE).toBe("Europe/Sofia");
    expect(getTodayInTimezone()).toBe(getTodayInTimezone(APP_TIMEZONE));
  });

  it("returns tomorrow's date in Sofia when it is still yesterday in UTC", () => {
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
});
