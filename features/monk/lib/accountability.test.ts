import { describe, expect, it } from "vitest";

import type { MonkChallenge, MonkDay } from "@/lib/supabase/monk-types";

import {
  computeChallengeStreaks,
  DEFAULT_GAMING_LIMIT_MINUTES,
  finalizationSourceForMissingDay,
  isDayLocked,
  isDigitalFastingPassed,
  MILESTONE_DAYS,
  nextStartDate,
  previousBestStreak,
  scoreDay,
  shouldResetOnFail,
  type DayScoreInput,
} from "./accountability";

/**
 * A day where everything mandatory was done and both screen-time limits were
 * respected. Individual tests override only the field under test, so a change
 * in default scoring cannot silently make a failing case look like it passes.
 */
function passingDay(overrides: Partial<DayScoreInput> = {}): DayScoreInput {
  return {
    habits: [],
    tasks: [],
    socialMediaLimitMinutes: 30,
    socialMediaActualMinutes: 10,
    gamingLimitMinutes: DEFAULT_GAMING_LIMIT_MINUTES,
    gamingActualMinutes: 0,
    maxMandatoryFailuresAllowed: 0,
    ...overrides,
  };
}

describe("isDigitalFastingPassed", () => {
  it("passes when usage is under the limit", () => {
    expect(isDigitalFastingPassed(10, 30)).toBe(true);
  });

  it("passes when usage exactly equals the limit", () => {
    expect(isDigitalFastingPassed(30, 30)).toBe(true);
  });

  it("fails when usage is over the limit", () => {
    expect(isDigitalFastingPassed(31, 30)).toBe(false);
  });

  it("fails when usage was never reported", () => {
    // Not logging is a failure, not a free pass. This is the difference
    // between "I stayed under" and "I did not answer".
    expect(isDigitalFastingPassed(null, 30)).toBe(false);
  });

  it("passes at zero usage against a zero limit", () => {
    expect(isDigitalFastingPassed(0, 0)).toBe(true);
  });

  it("fails any usage against a zero limit", () => {
    expect(isDigitalFastingPassed(1, 0)).toBe(false);
  });
});

describe("scoreDay", () => {
  it("passes a fully compliant day", () => {
    const score = scoreDay(passingDay());

    expect(score.passed).toBe(true);
    expect(score.mandatoryFailures).toBe(0);
    expect(score.digitalFastingPassed).toBe(true);
    expect(score.socialMediaPassed).toBe(true);
    expect(score.gamingPassed).toBe(true);
  });

  it("counts digital fasting as one mandatory item even with no habits or tasks", () => {
    expect(scoreDay(passingDay()).mandatoryCount).toBe(1);
  });

  it("fails the day when social media is over the limit", () => {
    const score = scoreDay(passingDay({ socialMediaActualMinutes: 31 }));

    expect(score.socialMediaPassed).toBe(false);
    expect(score.digitalFastingPassed).toBe(false);
    expect(score.mandatoryFailures).toBe(1);
    expect(score.passed).toBe(false);
  });

  it("fails the day when gaming is over the limit", () => {
    const score = scoreDay(passingDay({ gamingActualMinutes: 45 }));

    expect(score.gamingPassed).toBe(false);
    expect(score.digitalFastingPassed).toBe(false);
    expect(score.passed).toBe(false);
  });

  it("counts both screen-time breaches as a single mandatory failure", () => {
    // Digital fasting is one mandatory item, so blowing both limits must not
    // double-count and blow through a failure allowance twice as fast.
    const score = scoreDay(
      passingDay({ socialMediaActualMinutes: 90, gamingActualMinutes: 90 }),
    );

    expect(score.mandatoryCount).toBe(1);
    expect(score.mandatoryFailures).toBe(1);
  });

  it("fails when either screen-time figure is unreported", () => {
    expect(scoreDay(passingDay({ socialMediaActualMinutes: null })).passed).toBe(
      false,
    );
    expect(scoreDay(passingDay({ gamingActualMinutes: null })).passed).toBe(
      false,
    );
  });

  it("counts incomplete mandatory habits as failures", () => {
    const score = scoreDay(
      passingDay({
        habits: [
          { is_mandatory_snapshot: true, is_completed: true },
          { is_mandatory_snapshot: true, is_completed: false },
        ],
      }),
    );

    expect(score.mandatoryCount).toBe(3);
    expect(score.mandatoryFailures).toBe(1);
    expect(score.passed).toBe(false);
  });

  it("ignores optional habits entirely", () => {
    const score = scoreDay(
      passingDay({
        habits: [
          { is_mandatory_snapshot: false, is_completed: false },
          { is_mandatory_snapshot: false, is_completed: false },
        ],
      }),
    );

    expect(score.mandatoryCount).toBe(1);
    expect(score.mandatoryFailures).toBe(0);
    expect(score.passed).toBe(true);
  });

  it("counts incomplete mandatory tasks as failures and ignores optional ones", () => {
    const score = scoreDay(
      passingDay({
        tasks: [
          { is_mandatory: true, is_completed: false },
          { is_mandatory: false, is_completed: false },
        ],
      }),
    );

    expect(score.mandatoryCount).toBe(2);
    expect(score.mandatoryFailures).toBe(1);
    expect(score.passed).toBe(false);
  });

  it("uses the habit snapshot rather than the habit's current mandatory flag", () => {
    // Snapshots exist so that making a habit optional today cannot
    // retroactively rescue a day that already failed because of it.
    const score = scoreDay(
      passingDay({ habits: [{ is_mandatory_snapshot: true, is_completed: false }] }),
    );

    expect(score.mandatoryFailures).toBe(1);
  });

  it("passes when failures are within the allowance", () => {
    const score = scoreDay(
      passingDay({
        habits: [{ is_mandatory_snapshot: true, is_completed: false }],
        maxMandatoryFailuresAllowed: 1,
      }),
    );

    expect(score.mandatoryFailures).toBe(1);
    expect(score.passed).toBe(true);
  });

  it("fails at exactly one more than the allowance", () => {
    const score = scoreDay(
      passingDay({
        habits: [
          { is_mandatory_snapshot: true, is_completed: false },
          { is_mandatory_snapshot: true, is_completed: false },
        ],
        maxMandatoryFailuresAllowed: 1,
      }),
    );

    expect(score.mandatoryFailures).toBe(2);
    expect(score.passed).toBe(false);
  });

  it("passes a day with no mandatory work beyond digital fasting", () => {
    const score = scoreDay(
      passingDay({
        habits: [{ is_mandatory_snapshot: false, is_completed: false }],
        tasks: [{ is_mandatory: false, is_completed: false }],
      }),
    );

    expect(score.passed).toBe(true);
  });

  it("aggregates failures across habits, tasks, and screen time", () => {
    const score = scoreDay(
      passingDay({
        habits: [{ is_mandatory_snapshot: true, is_completed: false }],
        tasks: [{ is_mandatory: true, is_completed: false }],
        socialMediaActualMinutes: 120,
      }),
    );

    expect(score.mandatoryCount).toBe(3);
    expect(score.mandatoryFailures).toBe(3);
    expect(score.passed).toBe(false);
  });
});

describe("shouldResetOnFail", () => {
  it("resets the challenge under the on_any_fail rule", () => {
    expect(shouldResetOnFail({ reset_rule: "on_any_fail" })).toBe(true);
  });

  it("does not reset under the other rules", () => {
    expect(shouldResetOnFail({ reset_rule: "consecutive_fails" })).toBe(false);
    expect(shouldResetOnFail({ reset_rule: "fails_in_window" })).toBe(false);
  });
});

describe("computeChallengeStreaks", () => {
  const activeChallenge = {
    status: "active" as const,
    target_days: 180,
    successful_days_count: 0,
    ended_day_number: null,
  };

  function days(passed: number, failed = 0) {
    return [
      ...Array.from({ length: passed }, (_, i) => ({
        status: "passed" as const,
        day_number: i + 1,
      })),
      ...Array.from({ length: failed }, (_, i) => ({
        status: "failed" as const,
        day_number: passed + i + 1,
      })),
    ] satisfies Pick<MonkDay, "status" | "day_number">[];
  }

  it("counts passed and failed days", () => {
    const streaks = computeChallengeStreaks({
      challenge: activeChallenge,
      days: days(5, 2),
      todayDayNumber: 8,
      previousBest: 0,
    });

    expect(streaks.daysPassed).toBe(5);
    expect(streaks.daysFailed).toBe(2);
    expect(streaks.currentStreak).toBe(5);
  });

  it("zeroes the current streak once the challenge is no longer active", () => {
    const streaks = computeChallengeStreaks({
      challenge: { ...activeChallenge, status: "failed", successful_days_count: 12 },
      days: days(12),
      todayDayNumber: 13,
      previousBest: 4,
    });

    expect(streaks.currentStreak).toBe(0);
    expect(streaks.bestStreak).toBe(12);
  });

  it("keeps an earlier attempt's best streak when the current one is shorter", () => {
    const streaks = computeChallengeStreaks({
      challenge: activeChallenge,
      days: days(3),
      todayDayNumber: 4,
      previousBest: 47,
    });

    expect(streaks.bestStreak).toBe(47);
  });

  it("clamps the day number to at least 1 on day one", () => {
    const streaks = computeChallengeStreaks({
      challenge: activeChallenge,
      days: [],
      todayDayNumber: 1,
      previousBest: 0,
    });

    expect(streaks.dayNumber).toBe(1);
    expect(streaks.daysPassed).toBe(0);
    expect(streaks.remainingDays).toBe(180);
    expect(streaks.completionPercent).toBe(0);
  });

  it("clamps a non-positive day number up to 1", () => {
    const streaks = computeChallengeStreaks({
      challenge: activeChallenge,
      days: [],
      todayDayNumber: 0,
      previousBest: 0,
    });

    expect(streaks.dayNumber).toBe(1);
  });

  it("clamps the day number to the target on and past day 180", () => {
    const streaks = computeChallengeStreaks({
      challenge: activeChallenge,
      days: days(180),
      todayDayNumber: 195,
      previousBest: 0,
    });

    expect(streaks.dayNumber).toBe(180);
    expect(streaks.remainingDays).toBe(0);
    expect(streaks.completionPercent).toBe(100);
  });

  it("never reports negative remaining days", () => {
    const streaks = computeChallengeStreaks({
      challenge: activeChallenge,
      days: days(185),
      todayDayNumber: 185,
      previousBest: 0,
    });

    expect(streaks.remainingDays).toBe(0);
  });

  it("rounds the completion percentage", () => {
    const streaks = computeChallengeStreaks({
      challenge: activeChallenge,
      days: days(90),
      todayDayNumber: 90,
      previousBest: 0,
    });

    expect(streaks.completionPercent).toBe(50);
  });
});

describe("previousBestStreak", () => {
  it("returns the highest successful day count", () => {
    expect(
      previousBestStreak([
        { successful_days_count: 3 },
        { successful_days_count: 47 },
        { successful_days_count: 12 },
      ]),
    ).toBe(47);
  });

  it("returns 0 with no prior attempts", () => {
    expect(previousBestStreak([])).toBe(0);
  });
});

describe("nextStartDate", () => {
  it("starts today on a first attempt", () => {
    expect(nextStartDate({ today: "2026-09-02", lastEndedOn: null })).toBe(
      "2026-09-02",
    );
  });

  it("starts the day after a challenge that ended today", () => {
    // Restarting on the same date the previous attempt ended would collide on
    // the (challenge_id, date) uniqueness of monk_days.
    expect(
      nextStartDate({ today: "2026-09-02", lastEndedOn: "2026-09-02" }),
    ).toBe("2026-09-03");
  });

  it("starts today when the previous attempt ended in the past", () => {
    expect(
      nextStartDate({ today: "2026-09-02", lastEndedOn: "2026-08-20" }),
    ).toBe("2026-09-02");
  });

  it("crosses a month boundary when the attempt ended on the last day", () => {
    expect(
      nextStartDate({ today: "2026-08-31", lastEndedOn: "2026-08-31" }),
    ).toBe("2026-09-01");
  });
});

describe("isDayLocked", () => {
  it("is unlocked while in progress and not finalized", () => {
    expect(isDayLocked({ finalized_at: null, status: "in_progress" })).toBe(false);
  });

  it("is locked once finalized", () => {
    expect(
      isDayLocked({ finalized_at: "2026-09-02T21:00:00Z", status: "passed" }),
    ).toBe(true);
  });

  it("is locked when the status moved off in_progress even without a timestamp", () => {
    expect(isDayLocked({ finalized_at: null, status: "failed" })).toBe(true);
  });
});

describe("finalizationSourceForMissingDay", () => {
  it("marks an existing row as automatically finalized", () => {
    expect(finalizationSourceForMissingDay(true)).toBe("automatic");
  });

  it("marks a never-opened day as missed by the system", () => {
    expect(finalizationSourceForMissingDay(false)).toBe("system_missed");
  });
});

describe("constants", () => {
  it("exposes ascending milestones ending at the 180-day target", () => {
    expect(MILESTONE_DAYS).toEqual([7, 30, 60, 90, 120, 180]);
    expect([...MILESTONE_DAYS]).toEqual([...MILESTONE_DAYS].sort((a, b) => a - b));
  });

  it("defaults the gaming limit to 30 minutes", () => {
    expect(DEFAULT_GAMING_LIMIT_MINUTES).toBe(30);
  });
});

// Type-level guard: the challenge shape scoreDay/shouldResetOnFail rely on must
// stay assignable from the real DB row type.
const _resetRuleShape: Pick<MonkChallenge, "reset_rule"> = {
  reset_rule: "on_any_fail",
};
void _resetRuleShape;
