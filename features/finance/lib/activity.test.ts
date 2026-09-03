import { describe, expect, it } from "vitest";

import type { RecentTransaction } from "@/features/finance/types";
import {
  buildMonthActivity,
  categoryLabel,
  groupTransactionsByCategory,
  spentByCurrency,
} from "./activity";

function tx(overrides: Partial<RecentTransaction> = {}): RecentTransaction {
  return {
    id: "tx-1",
    type: "expense",
    amount: 10,
    currency: "EUR",
    date: "2026-09-03",
    payee: "Cafe",
    notes: null,
    accountName: "Revolut",
    categoryId: "cat-dining",
    categoryName: "Dining Out",
    transferAccountName: null,
    ...overrides,
  };
}

describe("spentByCurrency", () => {
  it("sums expenses and ignores income and transfers", () => {
    expect(
      spentByCurrency([
        tx({ id: "e1", type: "expense", amount: 12.5 }),
        tx({ id: "e2", type: "expense", amount: 7.5, currency: "EUR" }),
        tx({ id: "i1", type: "income", amount: 1000, categoryName: "Salary" }),
        tx({
          id: "t1",
          type: "transfer",
          amount: 50,
          categoryName: null,
          transferAccountName: "Wallet",
        }),
      ]),
    ).toEqual([{ currency: "EUR", amount: 20 }]);
  });

  it("keeps currencies separate", () => {
    expect(
      spentByCurrency([
        tx({ id: "eur", amount: 10, currency: "EUR" }),
        tx({ id: "usd", amount: 4, currency: "USD" }),
      ]),
    ).toEqual([
      { currency: "EUR", amount: 10 },
      { currency: "USD", amount: 4 },
    ]);
  });

  it("returns an empty list when nothing was spent", () => {
    expect(spentByCurrency([])).toEqual([]);
    expect(spentByCurrency([tx({ type: "income", amount: 50 })])).toEqual([]);
  });
});

describe("buildMonthActivity", () => {
  it("scopes spent and category totals to the given transactions", () => {
    const month = {
      year: 2026,
      month: 9,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    };
    const activity = buildMonthActivity(month, [
      tx({ id: "e1", amount: 20 }),
      tx({ id: "i1", type: "income", amount: 100, categoryName: "Salary" }),
    ]);

    expect(activity.month).toEqual(month);
    expect(activity.spentByCurrency).toEqual([{ currency: "EUR", amount: 20 }]);
    expect(activity.categoryGroups).toHaveLength(2);
  });
});
describe("groupTransactionsByCategory", () => {
  it("groups by category and signs income vs expense", () => {
    const groups = groupTransactionsByCategory([
      tx({ id: "e1", amount: 10, categoryName: "Dining Out" }),
      tx({ id: "e2", amount: 5, categoryName: "Dining Out" }),
      tx({ id: "i1", type: "income", amount: 100, categoryName: "Salary" }),
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Salary", "Dining Out"]);
    expect(groups[0].totalsByCurrency).toEqual([{ currency: "EUR", total: 100 }]);
    expect(groups[1].totalsByCurrency).toEqual([{ currency: "EUR", total: -15 }]);
    expect(groups[1].transactions).toHaveLength(2);
  });

  it("labels a transfer without a category as Transfers", () => {
    expect(categoryLabel(tx({ type: "transfer", categoryName: null }))).toBe("Transfers");
    expect(categoryLabel(tx({ categoryName: "  " }))).toBe("Uncategorized");
  });
});
