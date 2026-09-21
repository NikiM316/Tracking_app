import * as z from "zod";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z
  .string()
  .trim()
  .regex(UUID_PATTERN, "Must be a valid UUID.");

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code (e.g. EUR).");

export function issueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

export function parseActionInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: issueMessage(result.error) };
  }
  return { ok: true, data: result.data };
}

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}
