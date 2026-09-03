import { describe, expect, it } from "vitest";

import {
  deriveAccountBalances,
  movementsFromCashflowAggregates,
  netMovementByAccount,
  nextHoldingPosition,
  type BalanceMovementInput,
} from "./balances";

const CHECKING = "acc-checking";
const SAVINGS = "acc-savings";

function tx(overrides: Partial<BalanceMovementInput> = {}): BalanceMovementInput {
  return {
    account_id: CHECKING,
    type: "expense",
    amount: 10,
    transfer_account_id: null,
    ...overrides,
  };
}

describe("netMovementByAccount", () => {
  it("credits income and debits expenses", () => {
    const movements = netMovementByAccount([
      tx({ type: "income", amount: 2500 }),
      tx({ type: "expense", amount: 400 }),
    ]);

    expect(movements.get(CHECKING)).toBe(2100);
  });

  it("mirrors a transfer across both accounts", () => {
    const movements = netMovementByAccount([
      tx({ type: "transfer", amount: 300, transfer_account_id: SAVINGS }),
    ]);

    expect(movements.get(CHECKING)).toBe(-300);
    expect(movements.get(SAVINGS)).toBe(300);
  });

  it("leaves net worth unchanged across a transfer", () => {
    const movements = netMovementByAccount([
      tx({ type: "transfer", amount: 300, transfer_account_id: SAVINGS }),
    ]);
    const total = [...movements.values()].reduce((sum, n) => sum + n, 0);

    expect(total).toBe(0);
  });

  it("skips a transfer with no counterparty instead of counting it one-sided", () => {
    // A one-sided transfer would silently destroy money from net worth.
    const movements = netMovementByAccount([
      tx({ type: "transfer", amount: 300, transfer_account_id: null }),
    ]);

    expect(movements.size).toBe(0);
  });

  it("reconciles two linked transfer rows as one logical transfer", () => {
    const sourceId = "tx-out";
    const destId = "tx-in";
    const source = tx({
      id: sourceId,
      type: "transfer",
      amount: 300,
      account_id: CHECKING,
      transfer_account_id: SAVINGS,
      transfer_transaction_id: destId,
      created_at: "2026-09-01T10:00:00Z",
    });
    const dest = tx({
      id: destId,
      type: "transfer",
      amount: 300,
      account_id: SAVINGS,
      transfer_account_id: CHECKING,
      transfer_transaction_id: sourceId,
      created_at: "2026-09-01T10:00:01Z",
    });

    // Applying both rows independently would cancel (mirrors) or double
    // (twins). Either ordering must debit source and credit dest once.
    for (const rows of [
      [source, dest],
      [dest, source],
    ]) {
      const movements = netMovementByAccount(rows);
      expect(movements.get(CHECKING)).toBe(-300);
      expect(movements.get(SAVINGS)).toBe(300);
      expect(movements.size).toBe(2);
    }
  });

  it("ignores unrecognized transaction types", () => {
    expect(netMovementByAccount([tx({ type: "wat", amount: 999 })]).size).toBe(0);
  });

  it("treats amounts as always positive with direction from type", () => {
    // The DB enforces amount > 0; the sign must come from `type` alone.
    const movements = netMovementByAccount([
      tx({ type: "expense", amount: 50 }),
      tx({ type: "income", amount: 50 }),
    ]);

    expect(movements.get(CHECKING)).toBe(0);
  });

  it("coerces numeric strings, since numeric(18,2) arrives as a string", () => {
    const movements = netMovementByAccount([
      tx({ type: "income", amount: "1000.50" }),
      tx({ type: "expense", amount: "0.50" }),
    ]);

    expect(movements.get(CHECKING)).toBe(1000);
  });

  it("returns an empty map for no transactions", () => {
    expect(netMovementByAccount([]).size).toBe(0);
  });

  it("accumulates many transactions per account", () => {
    const movements = netMovementByAccount(
      Array.from({ length: 10 }, () => tx({ type: "expense", amount: 5 })),
    );

    expect(movements.get(CHECKING)).toBe(-50);
  });
});

describe("movementsFromCashflowAggregates", () => {
  it("turns grouped income and expense sums into signed movements", () => {
    const movements = movementsFromCashflowAggregates([
      { account_id: CHECKING, type: "income", net: 2500 },
      { account_id: CHECKING, type: "expense", net: "400.00" },
      { account_id: SAVINGS, type: "income", net: 100 },
    ]);

    expect(netMovementByAccount(movements).get(CHECKING)).toBe(2100);
    expect(netMovementByAccount(movements).get(SAVINGS)).toBe(100);
  });

  it("ignores non-cashflow types, zeros, and non-numeric totals", () => {
    expect(
      movementsFromCashflowAggregates([
        { account_id: CHECKING, type: "transfer", net: 300 },
        { account_id: CHECKING, type: "income", net: 0 },
        { account_id: CHECKING, type: "expense", net: null },
        { account_id: CHECKING, type: "income", net: "nope" },
      ]),
    ).toEqual([]);
  });
});

describe("deriveAccountBalances", () => {
  const accounts = [
    { id: CHECKING, opening_balance: 1000 },
    { id: SAVINGS, opening_balance: 5000 },
  ];

  it("adds net movement to the opening balance", () => {
    const [checking, savings] = deriveAccountBalances(accounts, [
      tx({ type: "expense", amount: 250 }),
      tx({ account_id: SAVINGS, type: "income", amount: 100 }),
    ]);

    expect(checking.balance).toBe(750);
    expect(savings.balance).toBe(5100);
  });

  it("falls back to the opening balance for an account with no activity", () => {
    const [checking, savings] = deriveAccountBalances(accounts, []);

    expect(checking.balance).toBe(1000);
    expect(savings.balance).toBe(5000);
  });

  it("preserves the original account fields", () => {
    const [account] = deriveAccountBalances(
      [{ id: CHECKING, opening_balance: 1000, name: "Main" }],
      [],
    );

    expect(account.name).toBe("Main");
    expect(account.id).toBe(CHECKING);
  });

  it("coerces a string opening balance", () => {
    const [account] = deriveAccountBalances(
      [{ id: CHECKING, opening_balance: "1000.00" }],
      [tx({ type: "income", amount: 1 })],
    );

    expect(account.balance).toBe(1001);
  });

  it("allows a negative balance, as a credit card or overdraft would have", () => {
    const [account] = deriveAccountBalances(
      [{ id: CHECKING, opening_balance: 0 }],
      [tx({ type: "expense", amount: 500 })],
    );

    expect(account.balance).toBe(-500);
  });

  it("returns an empty list when there are no accounts", () => {
    expect(deriveAccountBalances([], [tx()])).toEqual([]);
  });

  it("keeps a transfer's total across the two accounts flat", () => {
    const derived = deriveAccountBalances(accounts, [
      tx({ type: "transfer", amount: 400, transfer_account_id: SAVINGS }),
    ]);
    const total = derived.reduce((sum, a) => sum + a.balance, 0);

    expect(total).toBe(6000);
  });
});

describe("nextHoldingPosition", () => {
  it("opens a new position at the purchase price", () => {
    expect(
      nextHoldingPosition({
        type: "buy",
        quantity: 10,
        price: 100,
        previousQuantity: 0,
        previousAverageCost: 0,
      }),
    ).toEqual({ quantity: 10, averageCost: 100 });
  });

  it("weights the average cost by quantity on a follow-up buy", () => {
    // 10 @ 100 then 10 @ 200 -> 20 @ 150.
    expect(
      nextHoldingPosition({
        type: "buy",
        quantity: 10,
        price: 200,
        previousQuantity: 10,
        previousAverageCost: 100,
      }),
    ).toEqual({ quantity: 20, averageCost: 150 });
  });

  it("weights toward the larger tranche rather than averaging the prices", () => {
    // A naive (100 + 200) / 2 would give 150; the correct answer is 180.
    expect(
      nextHoldingPosition({
        type: "buy",
        quantity: 40,
        price: 200,
        previousQuantity: 10,
        previousAverageCost: 100,
      }),
    ).toEqual({ quantity: 50, averageCost: 180 });
  });

  it("leaves the cost basis untouched on a partial sell", () => {
    // Selling must not change the basis, or realized P&L becomes meaningless.
    expect(
      nextHoldingPosition({
        type: "sell",
        quantity: 4,
        price: 500,
        previousQuantity: 10,
        previousAverageCost: 100,
      }),
    ).toEqual({ quantity: 6, averageCost: 100 });
  });

  it("resets the cost basis when the position is fully closed", () => {
    expect(
      nextHoldingPosition({
        type: "sell",
        quantity: 10,
        price: 500,
        previousQuantity: 10,
        previousAverageCost: 100,
      }),
    ).toEqual({ quantity: 0, averageCost: 0 });
  });

  it("starts a re-entry from the new price, not the old basis", () => {
    const closed = nextHoldingPosition({
      type: "sell",
      quantity: 10,
      price: 500,
      previousQuantity: 10,
      previousAverageCost: 100,
    });

    expect(
      nextHoldingPosition({
        type: "buy",
        quantity: 5,
        price: 300,
        previousQuantity: closed.quantity,
        previousAverageCost: closed.averageCost,
      }),
    ).toEqual({ quantity: 5, averageCost: 300 });
  });

  it("handles a zero-quantity buy without dividing by zero", () => {
    expect(
      nextHoldingPosition({
        type: "buy",
        quantity: 0,
        price: 100,
        previousQuantity: 0,
        previousAverageCost: 0,
      }),
    ).toEqual({ quantity: 0, averageCost: 0 });
  });

  it("supports fractional quantities for crypto", () => {
    const position = nextHoldingPosition({
      type: "buy",
      quantity: 0.5,
      price: 2000,
      previousQuantity: 0.5,
      previousAverageCost: 1000,
    });

    expect(position.quantity).toBe(1);
    expect(position.averageCost).toBe(1500);
  });

  it("treats a free acquisition as lowering the basis", () => {
    expect(
      nextHoldingPosition({
        type: "buy",
        quantity: 10,
        price: 0,
        previousQuantity: 10,
        previousAverageCost: 100,
      }),
    ).toEqual({ quantity: 20, averageCost: 50 });
  });

  it("treats any non-buy type as a reduction", () => {
    expect(
      nextHoldingPosition({
        type: "transfer_out",
        quantity: 3,
        price: 0,
        previousQuantity: 10,
        previousAverageCost: 100,
      }),
    ).toEqual({ quantity: 7, averageCost: 100 });
  });
});
