import { describe, expect, it } from "vitest";

import {
  bulkImportTransactionRowSchema,
  createAccountSchema,
  createTransactionSchema,
  financeAccountTypeSchema,
} from "./schemas";
import { parseActionInput, parseWithSchema } from "@/lib/validation";

const ACCOUNT_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const CATEGORY_ID = "4f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OTHER_ACCOUNT_ID = "5f2504e0-4f89-11d3-9a0c-0305e82c3301";

describe("createAccountSchema", () => {
  it("accepts a valid checking account", () => {
    const parsed = parseActionInput(createAccountSchema, {
      name: " Revolut EUR ",
      accountType: "checking",
      currency: "eur",
      openingBalance: "12,50",
    });

    expect(parsed).toEqual({
      ok: true,
      data: {
        name: "Revolut EUR",
        accountType: "checking",
        currency: "EUR",
        openingBalance: 12.5,
      },
    });
  });

  it("rejects an account type that is not in the enum", () => {
    const parsed = parseActionInput(createAccountSchema, {
      name: "Wallet",
      accountType: "paypal",
    });

    expect(parsed.ok).toBe(false);
  });
});

describe("createTransactionSchema", () => {
  it("requires a UUID account and category for expenses", () => {
    const invalid = parseActionInput(createTransactionSchema, {
      type: "expense",
      accountId: "not-a-uuid",
      categoryId: CATEGORY_ID,
      amount: 10,
    });
    expect(invalid.ok).toBe(false);

    const valid = parseActionInput(createTransactionSchema, {
      type: "expense",
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      amount: "10,00",
      date: "2026-09-20",
    });
    expect(valid).toMatchObject({
      ok: true,
      data: {
        type: "expense",
        accountId: ACCOUNT_ID,
        categoryId: CATEGORY_ID,
        amount: 10,
        date: "2026-09-20",
      },
    });
  });

  it("rejects a transfer to the same account", () => {
    const parsed = parseActionInput(createTransactionSchema, {
      type: "transfer",
      accountId: ACCOUNT_ID,
      transferAccountId: ACCOUNT_ID,
      amount: 5,
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toMatch(/differ from the source account/i);
    }
  });

  it("accepts a transfer between two accounts", () => {
    const parsed = parseActionInput(createTransactionSchema, {
      type: "transfer",
      accountId: ACCOUNT_ID,
      transferAccountId: OTHER_ACCOUNT_ID,
      amount: 5,
    });

    expect(parsed.ok).toBe(true);
  });
});

describe("bulkImportTransactionRowSchema", () => {
  it("accepts a signed amount with a real calendar date", () => {
    const parsed = bulkImportTransactionRowSchema.safeParse({
      date: "2026-02-28",
      amount: -12.5,
      description: "Coffee",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects an impossible calendar date even if it matches YYYY-MM-DD", () => {
    const parsed = bulkImportTransactionRowSchema.safeParse({
      date: "2026-02-31",
      amount: -12.5,
      description: "Coffee",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const parsed = bulkImportTransactionRowSchema.safeParse({
      date: "2026-09-20",
      amount: 0,
      description: "Noise",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("parseWithSchema", () => {
  it("parses a finance account type without an unsafe cast", () => {
    expect(parseWithSchema(financeAccountTypeSchema, "savings")).toBe("savings");
    expect(parseWithSchema(financeAccountTypeSchema, "paypal")).toBeNull();
  });
});
