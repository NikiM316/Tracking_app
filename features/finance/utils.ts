export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
