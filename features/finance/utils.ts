export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** HTML `pattern` that accepts digits with an optional comma or dot decimal. */
export const DECIMAL_INPUT_PATTERN = "[0-9]*[.,]?[0-9]*";

const DECIMAL_VALUE_PATTERN = /^\d*\.?\d*$/;

/**
 * Normalizes a typed decimal (comma → dot) and accepts only digits with at
 * most one decimal point. Returns `null` when the raw value is invalid so
 * the caller can ignore the keystroke.
 */
export function sanitizeDecimalInput(raw: string): string | null {
  const normalized = raw.replace(",", ".");
  if (normalized === "" || DECIMAL_VALUE_PATTERN.test(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Parses a sanitized decimal string. Commas are treated as decimal points
 * so European mobile keyboards submit correctly.
 */
export function parseDecimal(value: string): number {
  return parseFloat(value.replace(",", "."));
}

/**
 * Coerces a server-action argument into a finite number. Accepts numbers and
 * decimal strings (comma or dot) so mobile clients cannot smuggle a comma
 * through as an invalid amount.
 */
export function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return parseDecimal(value);
  }
  return Number.NaN;
}

/**
 * Normalizes a category id to a UUID string, or null when empty.
 * Returns `undefined` when the value is present but not a valid UUID.
 */
export function parseCategoryId(
  value: string | null | undefined,
): string | null | undefined {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "null") {
    return null;
  }

  if (!UUID_PATTERN.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}
