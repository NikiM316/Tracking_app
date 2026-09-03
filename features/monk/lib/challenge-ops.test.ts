import { beforeEach, describe, expect, it } from "vitest";

import type { MonkChallenge, MonkDay } from "@/lib/supabase/monk-types";

import {
  catchUpMissedDays,
  finalizeDayAndMaybeReset,
  getDayByDate,
  getOrCreateDayWithHabits,
} from "./challenge-ops";
import { createFakeSupabase } from "./test-support/fake-supabase";

const USER_ID = "00000000-0000-0000-0000-000000000000";
const CHALLENGE_ID = "challenge-1";

function makeChallenge(overrides: Partial<MonkChallenge> = {}): MonkChallenge {
  return {
    id: CHALLENGE_ID,
    user_id: USER_ID,
    attempt_number: 1,
    started_on: "2026-01-01",
    target_days: 180,
    status: "active",
    ended_on: null,
    ended_day_number: null,
    successful_days_count: 0,
    social_media_limit_minutes: 30,
    max_mandatory_failures_allowed: 0,
    reset_rule: "on_any_fail",
    reset_consecutive_count: null,
    reset_window_days: null,
    reset_window_fail_count: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as MonkChallenge;
}

function makeDay(overrides: Partial<MonkDay> = {}): MonkDay {
  return {
    id: "day-1",
    challenge_id: CHALLENGE_ID,
    user_id: USER_ID,
    date: "2026-01-01",
    day_number: 1,
    status: "in_progress",
    finalized_at: null,
    finalization_source: null,
    social_media_limit_minutes: 30,
    social_media_actual_minutes: null,
    gaming_limit_minutes: 30,
    gaming_actual_minutes: null,
    accomplished: null,
    failed_to_do: null,
    why_failed: null,
    improve_tomorrow: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as MonkDay;
}

/** A day that would score as passed: both limits reported and under. */
function compliantDayFields() {
  return { social_media_actual_minutes: 5, gaming_actual_minutes: 0 };
}

describe("catchUpMissedDays", () => {
  let fake: ReturnType<typeof createFakeSupabase>;

  /**
   * Seeds the fake database from the challenge under test. The loop reloads
   * the challenge from the database after each finalized day, so the stored
   * row has to agree with the argument — otherwise the reload silently swaps
   * in a different reset rule halfway through.
   */
  function begin(
    challenge: MonkChallenge,
    seed: Record<string, Record<string, unknown>[]> = {},
  ): MonkChallenge {
    fake = createFakeSupabase({ monk_challenges: [{ ...challenge }], ...seed });
    return challenge;
  }

  beforeEach(() => {
    fake = createFakeSupabase({});
  });

  it("returns the challenge untouched when it is not active", async () => {
    const challenge = begin(makeChallenge({ status: "failed" }));

    const result = await catchUpMissedDays(
      fake.client,
      USER_ID,
      challenge,
      "2026-01-10",
    );

    expect(result).toBe(challenge);
    expect(fake.db.queryLog).toEqual([]);
  });

  it("does nothing on the first day, since there is no yesterday to catch up", async () => {
    const challenge = begin(makeChallenge({ started_on: "2026-01-01" }));

    const result = await catchUpMissedDays(
      fake.client,
      USER_ID,
      challenge,
      "2026-01-01",
    );

    expect(result).toBe(challenge);
    expect(fake.db.rows("monk_days")).toHaveLength(0);
  });

  it("never finalizes today, only days up to yesterday", async () => {
    // Today is still in progress; finalizing it would score an unfinished day.
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
    );

    await catchUpMissedDays(fake.client, USER_ID, challenge, "2026-01-04");

    const dates = fake.db.rows("monk_days").map((day) => day.date);
    expect(dates).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(dates).not.toContain("2026-01-04");
  });

  it("creates and fails a single missed day", async () => {
    const challenge = begin(makeChallenge({ started_on: "2026-01-01" }));

    const result = await catchUpMissedDays(
      fake.client,
      USER_ID,
      challenge,
      "2026-01-02",
    );

    const days = fake.db.rows("monk_days");
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({
      date: "2026-01-01",
      day_number: 1,
      status: "failed",
      // Never opened, so the source records that the system missed it.
      finalization_source: "system_missed",
    });
    expect(result.status).toBe("failed");
  });

  it("fails a missed day because screen time was never reported", async () => {
    // This is the load-bearing consequence: an unopened day cannot pass,
    // because null actual minutes fail the digital-fasting check.
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
    );

    await catchUpMissedDays(fake.client, USER_ID, challenge, "2026-01-02");

    expect(fake.db.rows("monk_days")[0]).toMatchObject({
      status: "failed",
      social_media_actual_minutes: null,
      gaming_actual_minutes: null,
    });
  });

  it("stops at the first failure under the on_any_fail rule", async () => {
    // Nine days were missed, but the challenge dies on the first one, so only
    // one day row should ever be written.
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "on_any_fail",
      }),
    );

    const result = await catchUpMissedDays(
      fake.client,
      USER_ID,
      challenge,
      "2026-01-10",
    );

    expect(fake.db.rows("monk_days")).toHaveLength(1);
    expect(result.status).toBe("failed");
    expect(result.ended_on).toBe("2026-01-01");
    expect(result.ended_day_number).toBe(1);
    expect(
      fake.db.queryLog.filter((q) => q === "rpc catch_up_missed_days_tx"),
    ).toHaveLength(1);
  });

  it("walks every missed day when the rule is not on_any_fail", async () => {
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
    );

    const result = await catchUpMissedDays(
      fake.client,
      USER_ID,
      challenge,
      "2026-01-06",
    );

    const days = fake.db.rows("monk_days");
    expect(days).toHaveLength(5);
    expect(days.map((day) => day.date)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
    ]);
    expect(days.map((day) => day.day_number)).toEqual([1, 2, 3, 4, 5]);
    expect(days.every((day) => day.status === "failed")).toBe(true);
    expect(days.every((day) => day.finalization_source === "system_missed")).toBe(
      true,
    );
    expect(result.status).toBe("active");
    expect(fake.db.queryLog.filter((q) => q === "select monk_days")).toHaveLength(
      1,
    );
    expect(
      fake.db.queryLog.filter((q) => q === "rpc catch_up_missed_days_tx"),
    ).toHaveLength(1);
    expect(fake.db.queryLog.filter((q) => q === "insert monk_days")).toHaveLength(
      0,
    );
    expect(fake.db.queryLog.filter((q) => q === "update monk_days")).toHaveLength(
      0,
    );
  });

  it("assigns day numbers relative to the start date, not the catch-up window", async () => {
    // Day 1 is already finalized, so catch-up resumes at day 2.
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
      {
        monk_days: [
          makeDay({
            id: "day-existing",
            date: "2026-01-01",
            day_number: 1,
            status: "passed",
            finalized_at: "2026-01-01T22:00:00Z",
            finalization_source: "manual",
          }),
        ],
      },
    );

    await catchUpMissedDays(fake.client, USER_ID, challenge, "2026-01-04");

    const created = fake.db
      .rows("monk_days")
      .filter((day) => day.id !== "day-existing");
    expect(created.map((day) => day.day_number)).toEqual([2, 3]);
  });

  it("leaves already-finalized days alone rather than rescoring them", async () => {
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
      {
        monk_days: [
          makeDay({
            id: "day-passed",
            date: "2026-01-01",
            day_number: 1,
            status: "passed",
            finalized_at: "2026-01-01T22:00:00Z",
            finalization_source: "manual",
          }),
        ],
      },
    );

    await catchUpMissedDays(fake.client, USER_ID, challenge, "2026-01-03");

    const preserved = fake.db
      .rows("monk_days")
      .find((day) => day.id === "day-passed");
    expect(preserved).toMatchObject({
      status: "passed",
      finalization_source: "manual",
    });
  });

  it("marks a day that existed but was left open as automatically finalized", async () => {
    // "automatic" vs "system_missed" distinguishes "you opened it and walked
    // away" from "you never showed up".
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
      { monk_days: [makeDay({ id: "day-open", date: "2026-01-01", day_number: 1 })] },
    );

    await catchUpMissedDays(fake.client, USER_ID, challenge, "2026-01-02");

    expect(
      fake.db.rows("monk_days").find((day) => day.id === "day-open"),
    ).toMatchObject({
      status: "failed",
      finalization_source: "automatic",
    });
  });

  it("finalizes an open day and bulk-inserts later missing dates", async () => {
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
      { monk_days: [makeDay({ id: "day-open", date: "2026-01-01", day_number: 1 })] },
    );

    await catchUpMissedDays(fake.client, USER_ID, challenge, "2026-01-04");

    const days = [...fake.db.rows("monk_days")].sort((left, right) =>
      String(left.date).localeCompare(String(right.date)),
    );
    expect(days).toHaveLength(3);
    expect(days[0]).toMatchObject({
      id: "day-open",
      status: "failed",
      finalization_source: "automatic",
    });
    expect(days.slice(1)).toEqual([
      expect.objectContaining({
        date: "2026-01-02",
        status: "failed",
        finalization_source: "system_missed",
      }),
      expect.objectContaining({
        date: "2026-01-03",
        status: "failed",
        finalization_source: "system_missed",
      }),
    ]);
    expect(fake.db.queryLog.filter((q) => q === "insert monk_days")).toHaveLength(
      0,
    );
    expect(fake.db.queryLog.filter((q) => q === "update monk_days")).toHaveLength(
      0,
    );
    expect(
      fake.db.queryLog.filter((q) => q === "rpc catch_up_missed_days_tx"),
    ).toHaveLength(1);
  });

  it("does not create later missed days when an open day fails the attempt", async () => {
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "on_any_fail",
      }),
      { monk_days: [makeDay({ id: "day-open", date: "2026-01-01", day_number: 1 })] },
    );

    const result = await catchUpMissedDays(
      fake.client,
      USER_ID,
      challenge,
      "2026-01-04",
    );

    expect(fake.db.rows("monk_days")).toHaveLength(1);
    expect(result.status).toBe("failed");
    expect(fake.db.queryLog.filter((q) => q === "insert monk_days")).toHaveLength(
      0,
    );
    expect(
      fake.db.queryLog.filter((q) => q === "rpc catch_up_missed_days_tx"),
    ).toHaveLength(1);
  });

  it("does not catch up past the final day of the challenge", async () => {
    // A 3-day challenge left alone for a month must not create day 4+.
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        target_days: 3,
        reset_rule: "consecutive_fails",
      }),
    );

    await catchUpMissedDays(fake.client, USER_ID, challenge, "2026-02-01");

    const days = fake.db.rows("monk_days");
    expect(days).toHaveLength(3);
    expect(days.map((day) => day.day_number)).toEqual([1, 2, 3]);
  });

  it("completes the challenge when the final day passes", async () => {
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        target_days: 1,
        reset_rule: "consecutive_fails",
      }),
      {
        monk_days: [
          makeDay({
            id: "day-final",
            date: "2026-01-01",
            day_number: 1,
            ...compliantDayFields(),
          }),
        ],
      },
    );

    const result = await catchUpMissedDays(
      fake.client,
      USER_ID,
      challenge,
      "2026-01-02",
    );

    expect(
      fake.db.rows("monk_days").find((day) => day.id === "day-final"),
    ).toMatchObject({ status: "passed" });
    expect(result.status).toBe("completed");
    expect(result.ended_day_number).toBe(1);
  });

  it("snapshots active habits onto each created day", async () => {
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
      {
        monk_habits: [
          {
            id: "habit-active",
            user_id: USER_ID,
            is_active: true,
            is_mandatory: true,
            sort_order: 0,
            created_at: "2026-01-01T00:00:00Z",
            target_value: null,
            target_unit: null,
          },
          {
            id: "habit-inactive",
            user_id: USER_ID,
            is_active: false,
            is_mandatory: true,
            sort_order: 1,
            created_at: "2026-01-01T00:00:00Z",
            target_value: null,
            target_unit: null,
          },
        ],
      },
    );

    await catchUpMissedDays(fake.client, USER_ID, challenge, "2026-01-02");

    const logs = fake.db.rows("monk_habit_logs");
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      habit_id: "habit-active",
      is_mandatory_snapshot: true,
      is_completed: false,
    });
  });

  it("rolls back missed-day inserts when a later write in the rpc fails", async () => {
    const challenge = begin(
      makeChallenge({
        started_on: "2026-01-01",
        reset_rule: "consecutive_fails",
      }),
    );
    fake.db.failRpcAfterMissingDays = true;

    await expect(
      catchUpMissedDays(fake.client, USER_ID, challenge, "2026-01-03"),
    ).rejects.toThrow(/Failed to catch up missed days/);

    expect(fake.db.rows("monk_days")).toHaveLength(0);
    expect(fake.db.rows("monk_habit_logs")).toHaveLength(0);
  });
});

describe("finalizeDayAndMaybeReset", () => {
  it("passes a compliant day and leaves the challenge active", async () => {
    const challenge = makeChallenge({ reset_rule: "on_any_fail" });
    const day = makeDay(compliantDayFields());
    const fake = createFakeSupabase({
      monk_challenges: [makeChallenge()],
      monk_days: [{ ...day }],
    });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "manual",
    });

    expect(result.passed).toBe(true);
    expect(result.day.status).toBe("passed");
    expect(result.day.finalized_at).not.toBeNull();
    expect(result.challenge.status).toBe("active");
  });

  it("fails a day over the social media limit and resets the challenge", async () => {
    const challenge = makeChallenge({ reset_rule: "on_any_fail" });
    const day = makeDay({
      social_media_actual_minutes: 120,
      gaming_actual_minutes: 0,
    });
    const fake = createFakeSupabase({
      monk_challenges: [makeChallenge()],
      monk_days: [{ ...day }],
    });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "manual",
    });

    expect(result.passed).toBe(false);
    expect(result.day.status).toBe("failed");
    expect(result.challenge.status).toBe("failed");
    expect(result.challenge.ended_day_number).toBe(1);
  });

  it("keeps the challenge active on a failure when the rule is not on_any_fail", async () => {
    const challenge = makeChallenge({ reset_rule: "fails_in_window" });
    const day = makeDay({
      social_media_actual_minutes: 120,
      gaming_actual_minutes: 0,
    });
    const fake = createFakeSupabase({
      monk_challenges: [makeChallenge({ reset_rule: "fails_in_window" })],
      monk_days: [{ ...day }],
    });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "manual",
    });

    expect(result.passed).toBe(false);
    expect(result.challenge.status).toBe("active");
  });

  it("is idempotent on an already-finalized day", async () => {
    // Re-finalizing must not rescore or reset; the guard is what makes the
    // catch-up loop safe to run on every page load.
    const challenge = makeChallenge();
    const day = makeDay({
      status: "passed",
      finalized_at: "2026-01-01T22:00:00Z",
      finalization_source: "manual",
    });
    const fake = createFakeSupabase({
      monk_challenges: [makeChallenge()],
      monk_days: [{ ...day }],
    });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "automatic",
    });

    expect(result.passed).toBe(true);
    expect(result.day).toBe(day);
    expect(result.challenge).toBe(challenge);
    expect(fake.db.queryLog).toEqual([]);
  });

  it("reports a previously failed day without resetting again", async () => {
    const challenge = makeChallenge({ status: "failed" });
    const day = makeDay({
      status: "failed",
      finalized_at: "2026-01-01T22:00:00Z",
      finalization_source: "system_missed",
    });
    const fake = createFakeSupabase({ monk_days: [{ ...day }] });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "manual",
    });

    expect(result.passed).toBe(false);
    expect(fake.db.queryLog).toEqual([]);
  });

  it("completes the challenge when the target day passes", async () => {
    const challenge = makeChallenge({ target_days: 7 });
    const day = makeDay({
      day_number: 7,
      date: "2026-01-07",
      ...compliantDayFields(),
    });
    const fake = createFakeSupabase({
      monk_challenges: [makeChallenge({ target_days: 7 })],
      monk_days: [{ ...day }],
    });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "manual",
    });

    expect(result.passed).toBe(true);
    expect(result.challenge.status).toBe("completed");
    expect(result.challenge.ended_on).toBe("2026-01-07");
  });

  it("counts passed days into the closed challenge's successful_days_count", async () => {
    const challenge = makeChallenge({ target_days: 3 });
    const day = makeDay({
      id: "day-3",
      day_number: 3,
      date: "2026-01-03",
      ...compliantDayFields(),
    });
    const fake = createFakeSupabase({
      monk_challenges: [makeChallenge({ target_days: 3 })],
      monk_days: [
        makeDay({ id: "day-1", day_number: 1, date: "2026-01-01", status: "passed" }),
        makeDay({ id: "day-2", day_number: 2, date: "2026-01-02", status: "passed" }),
        { ...day },
      ],
    });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "manual",
    });

    expect(result.challenge.successful_days_count).toBe(3);
  });

  it("fails the day when a mandatory task is incomplete", async () => {
    const challenge = makeChallenge({ reset_rule: "consecutive_fails" });
    const day = makeDay(compliantDayFields());
    const fake = createFakeSupabase({
      monk_challenges: [makeChallenge({ reset_rule: "consecutive_fails" })],
      monk_days: [{ ...day }],
      monk_tasks: [
        {
          id: "task-1",
          day_id: day.id,
          user_id: USER_ID,
          is_mandatory: true,
          is_completed: false,
          sort_order: 0,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "manual",
    });

    expect(result.passed).toBe(false);
    expect(result.day.status).toBe("failed");
  });

  it("persists the reflection alongside the finalization", async () => {
    const challenge = makeChallenge({ reset_rule: "consecutive_fails" });
    const day = makeDay(compliantDayFields());
    const fake = createFakeSupabase({
      monk_challenges: [makeChallenge({ reset_rule: "consecutive_fails" })],
      monk_days: [{ ...day }],
    });

    const result = await finalizeDayAndMaybeReset(fake.client, {
      day,
      challenge,
      source: "manual",
      reflection: {
        accomplished: "shipped the migration",
        failed_to_do: null,
        why_failed: null,
        improve_tomorrow: "sleep earlier",
      },
    });

    expect(result.day).toMatchObject({
      accomplished: "shipped the migration",
      improve_tomorrow: "sleep earlier",
    });
  });
});

describe("getOrCreateDayWithHabits", () => {
  it("creates a day with the challenge's social media limit", async () => {
    const challenge = makeChallenge({ social_media_limit_minutes: 15 });
    const fake = createFakeSupabase({});

    const day = await getOrCreateDayWithHabits(fake.client, {
      challenge,
      userId: USER_ID,
      date: "2026-01-05",
      dayNumber: 5,
    });

    expect(day).toMatchObject({
      date: "2026-01-05",
      day_number: 5,
      social_media_limit_minutes: 15,
      gaming_limit_minutes: 30,
      status: "in_progress",
    });
  });

  it("returns the existing day instead of creating a duplicate", async () => {
    const challenge = makeChallenge();
    const existing = makeDay({ id: "day-existing", date: "2026-01-05", day_number: 5 });
    const fake = createFakeSupabase({ monk_days: [existing] });

    const day = await getOrCreateDayWithHabits(fake.client, {
      challenge,
      userId: USER_ID,
      date: "2026-01-05",
      dayNumber: 5,
    });

    expect(day.id).toBe("day-existing");
    expect(fake.db.rows("monk_days")).toHaveLength(1);
  });
});

describe("getDayByDate", () => {
  it("finds a day scoped to its challenge", async () => {
    const fake = createFakeSupabase({
      monk_days: [
        makeDay({ id: "mine", date: "2026-01-01" }),
        makeDay({ id: "other", challenge_id: "challenge-2", date: "2026-01-01" }),
      ],
    });

    const day = await getDayByDate(fake.client, CHALLENGE_ID, "2026-01-01");

    expect(day?.id).toBe("mine");
  });

  it("returns null when the date has no row", async () => {
    const fake = createFakeSupabase({ monk_days: [] });

    expect(await getDayByDate(fake.client, CHALLENGE_ID, "2026-01-01")).toBeNull();
  });
});
