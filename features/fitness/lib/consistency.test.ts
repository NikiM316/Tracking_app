import { describe, expect, it } from "vitest";

import { buildConsistencyDays } from "./consistency";

describe("buildConsistencyDays", () => {
  it("shows today as pending day 1 when there is no history", () => {
    expect(buildConsistencyDays("2026-09-10", [])).toEqual([
      {
        date: "2026-09-10",
        cycleDay: 1,
        programLabel: "Push A",
        status: "pending",
      },
    ]);
  });

  it("uses the stored cycle day when a workout row exists", () => {
    const days = buildConsistencyDays("2026-09-03", [
      { date: "2026-09-01", cycle_day: 8, completed_at: "2026-09-01T10:00:00Z" },
      { date: "2026-09-02", cycle_day: 9, completed_at: null },
      { date: "2026-09-03", cycle_day: 10, completed_at: null },
    ]);

    expect(days.map((day) => [day.date, day.cycleDay, day.status])).toEqual([
      ["2026-09-01", 8, "logged"],
      ["2026-09-02", 9, "missed"],
      ["2026-09-03", 10, "pending"],
    ]);
  });

  it("treats incomplete rest-day rows as rest, not missed", () => {
    const days = buildConsistencyDays("2026-09-02", [
      { date: "2026-09-01", cycle_day: 4, completed_at: null },
      { date: "2026-09-02", cycle_day: 7, completed_at: null },
    ]);

    expect(days[0]).toMatchObject({ status: "rest", programLabel: "Active Recovery" });
    expect(days[1]).toMatchObject({ status: "rest", programLabel: "Total Rest" });
  });

  it("does not advance cycle day across calendar gaps", () => {
    const days = buildConsistencyDays("2026-09-04", [
      { date: "2026-09-01", cycle_day: 5, completed_at: "2026-09-01T10:00:00Z" },
    ]);

    expect(days).toEqual([
      {
        date: "2026-09-01",
        cycleDay: 5,
        programLabel: "Upper A",
        status: "logged",
      },
      {
        date: "2026-09-02",
        cycleDay: null,
        programLabel: null,
        status: "missed",
      },
      {
        date: "2026-09-03",
        cycleDay: null,
        programLabel: null,
        status: "missed",
      },
      {
        date: "2026-09-04",
        cycleDay: 6,
        programLabel: "Lower A",
        status: "pending",
      },
    ]);
  });

  it("predicts today's rest day from history when /today has not created a row yet", () => {
    const days = buildConsistencyDays("2026-09-02", [
      { date: "2026-09-01", cycle_day: 3, completed_at: "2026-09-01T10:00:00Z" },
    ]);

    expect(days[1]).toMatchObject({
      date: "2026-09-02",
      cycleDay: 4,
      programLabel: "Active Recovery",
      status: "rest",
    });
  });

  it("starts the grid on the first logged workout, not an env anchor", () => {
    const days = buildConsistencyDays("2026-09-03", [
      { date: "2026-09-02", cycle_day: 1, completed_at: "2026-09-02T10:00:00Z" },
    ]);

    expect(days[0]?.date).toBe("2026-09-02");
    expect(days).toHaveLength(2);
  });
});
