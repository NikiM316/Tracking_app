import { describe, expect, it } from "vitest";

import {
  buildSmartWarmups,
  getWarmupWeightIncrement,
  isDumbbellExercise,
  roundWarmupWeight,
  SMART_WARMUP_PRESCRIPTION,
} from "./warmups";

const barbell = { slug: "barbell-back-squat", name: "Barbell Back Squat" };
const dumbbell = { slug: "flat-db-bench-press", name: "Flat DB Bench Press" };

describe("isDumbbellExercise", () => {
  it("detects the spelled-out word in the name", () => {
    expect(
      isDumbbellExercise({
        slug: "incline-dumbbell-press",
        name: "Incline Dumbbell Press",
      }),
    ).toBe(true);
  });

  it("detects a leading db- slug prefix", () => {
    expect(isDumbbellExercise({ slug: "db-goblet-squat", name: "DB Goblet Squat" })).toBe(
      true,
    );
  });

  it("detects an infix -db- slug segment", () => {
    expect(isDumbbellExercise({ slug: "heavy-db-row", name: "Heavy DB Row" })).toBe(true);
  });

  it("detects a standalone DB word regardless of case", () => {
    expect(isDumbbellExercise({ slug: "some-lift", name: "Some DB Lift" })).toBe(true);
    expect(isDumbbellExercise({ slug: "some-lift", name: "Some db Lift" })).toBe(true);
  });

  it("does not treat barbell work as dumbbell work", () => {
    expect(isDumbbellExercise(barbell)).toBe(false);
    expect(isDumbbellExercise({ slug: "bench-press", name: "Bench Press" })).toBe(false);
    expect(isDumbbellExercise({ slug: "overhead-press", name: "Overhead Press" })).toBe(
      false,
    );
  });

  it("does not match db embedded inside an unrelated word", () => {
    // A substring match on "db" alone would misfire here and switch the
    // rounding increment to the dumbbell one.
    expect(isDumbbellExercise({ slug: "deadbug", name: "Deadbug" })).toBe(false);
  });
});

describe("getWarmupWeightIncrement", () => {
  it("uses 2 kg for dumbbells, matching typical pair jumps", () => {
    expect(getWarmupWeightIncrement(dumbbell)).toBe(2);
  });

  it("uses 2.5 kg for barbells, matching the smallest usual plate pair", () => {
    expect(getWarmupWeightIncrement(barbell)).toBe(2.5);
  });
});

describe("roundWarmupWeight", () => {
  it("rounds to the nearest increment", () => {
    expect(roundWarmupWeight(51, 2.5)).toBe(50);
    expect(roundWarmupWeight(51.5, 2.5)).toBe(52.5);
    expect(roundWarmupWeight(11, 2)).toBe(12);
  });

  it("leaves an exact multiple untouched", () => {
    expect(roundWarmupWeight(50, 2.5)).toBe(50);
    expect(roundWarmupWeight(20, 2)).toBe(20);
  });

  it("rounds half-increments up", () => {
    expect(roundWarmupWeight(1.25, 2.5)).toBe(2.5);
    expect(roundWarmupWeight(1, 2)).toBe(2);
  });

  it("returns 0 for zero and negative input instead of a negative bar load", () => {
    expect(roundWarmupWeight(0, 2.5)).toBe(0);
    expect(roundWarmupWeight(-10, 2.5)).toBe(0);
  });

  it("can round a very light weight down to 0", () => {
    expect(roundWarmupWeight(1, 2.5)).toBe(0);
  });
});

describe("buildSmartWarmups", () => {
  it("returns one entry per prescribed step, ramping up", () => {
    const warmups = buildSmartWarmups(100, barbell);

    expect(warmups).toHaveLength(SMART_WARMUP_PRESCRIPTION.length);
    expect(warmups.map((w) => w.percent)).toEqual([0.5, 0.7, 0.9]);
    expect(warmups.map((w) => w.reps)).toEqual([8, 5, 1]);
  });

  it("computes barbell weights rounded to 2.5 kg", () => {
    expect(buildSmartWarmups(100, barbell).map((w) => w.weightKg)).toEqual([
      50, 70, 90,
    ]);
  });

  it("rounds awkward barbell percentages to the nearest 2.5 kg", () => {
    // 102.5 -> 51.25 / 71.75 / 92.25 before rounding. 51.25 sits exactly
    // half an increment out and rounds up to 52.5.
    expect(buildSmartWarmups(102.5, barbell).map((w) => w.weightKg)).toEqual([
      52.5, 72.5, 92.5,
    ]);
  });

  it("computes dumbbell weights rounded to 2 kg", () => {
    // 40 -> 20 / 28 / 36, all already even.
    expect(buildSmartWarmups(40, dumbbell).map((w) => w.weightKg)).toEqual([
      20, 28, 36,
    ]);
  });

  it("uses the dumbbell increment for awkward dumbbell percentages", () => {
    // 35 -> 17.5 / 24.5 / 31.5 before rounding to even kilos.
    expect(buildSmartWarmups(35, dumbbell).map((w) => w.weightKg)).toEqual([
      18, 24, 32,
    ]);
  });

  it("returns all-zero weights for a zero top set rather than negatives or NaN", () => {
    const warmups = buildSmartWarmups(0, barbell);

    expect(warmups.map((w) => w.weightKg)).toEqual([0, 0, 0]);
    expect(warmups).toHaveLength(3);
  });

  it("never prescribes more than the top set", () => {
    for (const top of [20, 42.5, 100, 187.5]) {
      for (const warmup of buildSmartWarmups(top, barbell)) {
        expect(warmup.weightKg).toBeLessThanOrEqual(top);
      }
    }
  });

  it("produces a non-decreasing ramp", () => {
    const weights = buildSmartWarmups(120, barbell).map((w) => w.weightKg);

    expect(weights).toEqual([...weights].sort((a, b) => a - b));
  });

  it("keeps the prescription percentages ordered and below 100%", () => {
    for (const step of SMART_WARMUP_PRESCRIPTION) {
      expect(step.percent).toBeGreaterThan(0);
      expect(step.percent).toBeLessThan(1);
    }
  });
});
