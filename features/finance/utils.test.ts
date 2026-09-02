import { describe, expect, it } from "vitest";

import {
  DECIMAL_INPUT_PATTERN,
  ISO_DATE_PATTERN,
  parseCategoryId,
  parseDecimal,
  sanitizeDecimalInput,
  toFiniteNumber,
  UUID_PATTERN,
} from "./utils";

const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

describe("ISO_DATE_PATTERN", () => {
  it("matches a full ISO date", () => {
    expect(ISO_DATE_PATTERN.test("2026-09-02")).toBe(true);
  });

  it("rejects partial or reformatted dates", () => {
    expect(ISO_DATE_PATTERN.test("2026-9-2")).toBe(false);
    expect(ISO_DATE_PATTERN.test("02/09/2026")).toBe(false);
    expect(ISO_DATE_PATTERN.test("")).toBe(false);
  });
});

describe("UUID_PATTERN", () => {
  it("matches a UUID in either case", () => {
    expect(UUID_PATTERN.test(UUID)).toBe(true);
    expect(UUID_PATTERN.test(UUID.toUpperCase())).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(UUID_PATTERN.test("not-a-uuid")).toBe(false);
    expect(UUID_PATTERN.test("")).toBe(false);
    expect(UUID_PATTERN.test(UUID.slice(0, -1))).toBe(false);
  });
});

describe("sanitizeDecimalInput", () => {
  it("converts a comma to a dot for European keyboards", () => {
    expect(sanitizeDecimalInput("12,50")).toBe("12.50");
  });

  it("passes through a dot decimal", () => {
    expect(sanitizeDecimalInput("12.50")).toBe("12.50");
  });

  it("allows an empty field so the input can be cleared", () => {
    expect(sanitizeDecimalInput("")).toBe("");
  });

  it("allows a partially typed decimal", () => {
    expect(sanitizeDecimalInput("12.")).toBe("12.");
    expect(sanitizeDecimalInput(".")).toBe(".");
    expect(sanitizeDecimalInput("0")).toBe("0");
  });

  it("rejects a second decimal separator", () => {
    expect(sanitizeDecimalInput("12.5.0")).toBeNull();
    expect(sanitizeDecimalInput("12,5,0")).toBeNull();
  });

  it("rejects letters and symbols", () => {
    expect(sanitizeDecimalInput("12a")).toBeNull();
    expect(sanitizeDecimalInput("€12")).toBeNull();
  });

  it("rejects a negative sign, since amounts are stored positive", () => {
    expect(sanitizeDecimalInput("-12")).toBeNull();
  });

  it("only replaces the first comma", () => {
    // "12,5,0" becomes "12.5,0", which then fails validation rather than
    // quietly producing a wrong number.
    expect(sanitizeDecimalInput("12,5,0")).toBeNull();
  });
});

describe("parseDecimal", () => {
  it("parses both comma and dot decimals to the same number", () => {
    expect(parseDecimal("12,50")).toBe(12.5);
    expect(parseDecimal("12.50")).toBe(12.5);
  });

  it("parses an integer string", () => {
    expect(parseDecimal("42")).toBe(42);
  });

  it("returns NaN for empty or non-numeric input", () => {
    expect(parseDecimal("")).toBeNaN();
    expect(parseDecimal("abc")).toBeNaN();
  });
});

describe("toFiniteNumber", () => {
  it("passes a number through", () => {
    expect(toFiniteNumber(42)).toBe(42);
    expect(toFiniteNumber(0)).toBe(0);
  });

  it("accepts a comma decimal string so a mobile comma cannot smuggle through", () => {
    expect(toFiniteNumber("12,50")).toBe(12.5);
  });

  it("accepts a dot decimal string", () => {
    expect(toFiniteNumber("12.50")).toBe(12.5);
  });

  it("returns NaN for types that are not numbers or strings", () => {
    expect(toFiniteNumber(null)).toBeNaN();
    expect(toFiniteNumber(undefined)).toBeNaN();
    expect(toFiniteNumber({})).toBeNaN();
    expect(toFiniteNumber([])).toBeNaN();
    expect(toFiniteNumber(true)).toBeNaN();
  });

  it("returns NaN for a non-numeric string", () => {
    expect(toFiniteNumber("abc")).toBeNaN();
    expect(toFiniteNumber("")).toBeNaN();
  });

  it("preserves a negative number so callers can reject it themselves", () => {
    expect(toFiniteNumber(-5)).toBe(-5);
    expect(toFiniteNumber("-5")).toBe(-5);
  });
});

describe("parseCategoryId", () => {
  it("returns a valid UUID unchanged", () => {
    expect(parseCategoryId(UUID)).toBe(UUID);
  });

  it("trims surrounding whitespace", () => {
    expect(parseCategoryId(`  ${UUID}  `)).toBe(UUID);
  });

  it("maps absent values to null", () => {
    expect(parseCategoryId(null)).toBeNull();
    expect(parseCategoryId(undefined)).toBeNull();
    expect(parseCategoryId("")).toBeNull();
    expect(parseCategoryId("   ")).toBeNull();
  });

  it('maps the literal string "null" to null, in either case', () => {
    // A <select> with no selection can post the string "null".
    expect(parseCategoryId("null")).toBeNull();
    expect(parseCategoryId("NULL")).toBeNull();
  });

  it("returns undefined for a malformed id, distinguishing it from a cleared one", () => {
    // The caller relies on undefined meaning "invalid, reject" while null
    // means "intentionally uncategorized".
    expect(parseCategoryId("not-a-uuid")).toBeUndefined();
    expect(parseCategoryId("123")).toBeUndefined();
    expect(parseCategoryId(UUID.slice(0, -1))).toBeUndefined();
  });
});

describe("DECIMAL_INPUT_PATTERN", () => {
  it("is anchored when used as an HTML pattern attribute", () => {
    const pattern = new RegExp(`^(?:${DECIMAL_INPUT_PATTERN})$`);

    expect(pattern.test("12")).toBe(true);
    expect(pattern.test("12.50")).toBe(true);
    expect(pattern.test("12,50")).toBe(true);
    expect(pattern.test("12.5.0")).toBe(false);
    expect(pattern.test("abc")).toBe(false);
  });
});
