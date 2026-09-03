import type { FinanceInvestmentTxType } from "@/lib/supabase/finance-types";

/**
 * Balances are never stored on finance_accounts; they are always derived as
 * opening_balance plus the signed sum of the account's cashflow transactions.
 * Keeping that derivation here (rather than inline in the server action) means
 * the sign conventions can be tested without a database.
 */

/** The transaction fields balance derivation actually needs. */
export type BalanceMovementInput = {
  id?: string;
  account_id: string;
  type: string;
  amount: number | string;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  created_at?: string;
};

/**
 * One grouped SUM() row from PostgREST (`account_id, type, net:amount.sum()`).
 * Income/expense can be reduced to a single synthetic movement per account.
 */
export type CashflowAggregateRow = {
  account_id: string;
  type: string;
  net: number | string | null;
};

/**
 * Turns aggregated income/expense totals into the same movement shape as
 * individual rows so `deriveAccountBalances` can stay the single source of
 * the sign convention.
 */
export function movementsFromCashflowAggregates(
  aggregates: readonly CashflowAggregateRow[],
): BalanceMovementInput[] {
  const movements: BalanceMovementInput[] = [];

  for (const row of aggregates) {
    if (row.type !== "income" && row.type !== "expense") {
      continue;
    }

    const amount = Number(row.net);
    if (!Number.isFinite(amount) || amount === 0) {
      continue;
    }

    movements.push({
      account_id: row.account_id,
      type: row.type,
      amount,
    });
  }

  return movements;
}

function transferPairKey(id: string, counterpartId: string): string {
  return id < counterpartId ? `${id}:${counterpartId}` : `${counterpartId}:${id}`;
}

/**
 * The outgoing row of a linked pair: its `account_id` is the source to debit
 * and its `transfer_account_id` is the destination to credit.
 *
 * Same-direction twins can use either row. Mirrored rows swap those two
 * accounts, so we take the earlier `created_at` (the row written as the
 * outflow) and fall back to `id` so missing timestamps cannot flip with
 * query order.
 */
function outgoingTransferRow(
  transaction: BalanceMovementInput,
  counterpart: BalanceMovementInput,
): BalanceMovementInput {
  if (
    transaction.account_id === counterpart.account_id &&
    transaction.transfer_account_id === counterpart.transfer_account_id
  ) {
    return transaction;
  }

  const transactionTime = transaction.created_at ?? "";
  const counterpartTime = counterpart.created_at ?? "";
  if (transactionTime && counterpartTime && transactionTime !== counterpartTime) {
    return transactionTime < counterpartTime ? transaction : counterpart;
  }

  return (transaction.id ?? "") <= (counterpart.id ?? "") ? transaction : counterpart;
}

/**
 * Sums the signed cash movement per account id.
 *
 * Sign convention: `amount` is always stored positive and the direction comes
 * from `type` — income credits the account, expense debits it, and a transfer
 * debits the source account while crediting the destination.
 *
 * Transfers may arrive as a single row (`account_id` = source,
 * `transfer_account_id` = destination) or as two mirrored rows linked by
 * `transfer_transaction_id`. Linked rows are one logical transfer: applying
 * both independently would debit and credit each account twice (or cancel
 * if the mirror swaps the accounts). A transfer with no `transfer_account_id`
 * is skipped rather than counted one-sided, which would silently unbalance
 * the books.
 */
export function netMovementByAccount(
  transactions: readonly BalanceMovementInput[],
): Map<string, number> {
  const netMovementByAccountId = new Map<string, number>();
  const appliedTransferPairs = new Set<string>();
  const transactionById = new Map<string, BalanceMovementInput>();

  for (const transaction of transactions) {
    if (transaction.id) {
      transactionById.set(transaction.id, transaction);
    }
  }

  const addMovement = (accountId: string, amount: number) => {
    netMovementByAccountId.set(
      accountId,
      (netMovementByAccountId.get(accountId) ?? 0) + amount,
    );
  };

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);

    if (transaction.type === "income") {
      addMovement(transaction.account_id, amount);
    } else if (transaction.type === "expense") {
      addMovement(transaction.account_id, -amount);
    } else if (transaction.type === "transfer" && transaction.transfer_account_id) {
      const counterpartId = transaction.transfer_transaction_id;
      const counterpart = counterpartId
        ? transactionById.get(counterpartId)
        : undefined;

      if (
        transaction.id &&
        counterpartId &&
        counterpart &&
        counterpart.type === "transfer"
      ) {
        const pairKey = transferPairKey(
          transaction.id,
          counterpart.id ?? counterpartId,
        );
        if (appliedTransferPairs.has(pairKey)) {
          continue;
        }
        appliedTransferPairs.add(pairKey);

        const source = outgoingTransferRow(transaction, counterpart);
        if (!source.transfer_account_id) {
          continue;
        }
        const sourceAmount = Number(source.amount);
        addMovement(source.account_id, -sourceAmount);
        addMovement(source.transfer_account_id, sourceAmount);
        continue;
      }

      addMovement(transaction.account_id, -amount);
      addMovement(transaction.transfer_account_id, amount);
    }
  }

  return netMovementByAccountId;
}

/** Attaches a derived `balance` to each account. */
export function deriveAccountBalances<
  T extends { id: string; opening_balance: number | string },
>(accounts: readonly T[], transactions: readonly BalanceMovementInput[]): (T & {
  balance: number;
})[] {
  const netMovementByAccountId = netMovementByAccount(transactions);

  return accounts.map((account) => ({
    ...account,
    balance:
      Number(account.opening_balance) +
      (netMovementByAccountId.get(account.id) ?? 0),
  }));
}

export type HoldingPosition = {
  quantity: number;
  averageCost: number;
};

/**
 * Applies a buy or sell to a holding, returning the new position.
 *
 * Buys move the weighted-average cost basis; sells do not, which is what makes
 * realized/unrealized P&L meaningful. A position closed out to zero resets its
 * average cost so a later re-entry starts from a clean basis rather than
 * inheriting the old one.
 */
export function nextHoldingPosition(params: {
  type: FinanceInvestmentTxType;
  quantity: number;
  price: number;
  previousQuantity: number;
  previousAverageCost: number;
}): HoldingPosition {
  if (params.type === "buy") {
    const quantity = params.previousQuantity + params.quantity;

    return {
      quantity,
      averageCost:
        quantity === 0
          ? 0
          : (params.previousQuantity * params.previousAverageCost +
              params.quantity * params.price) /
            quantity,
    };
  }

  const quantity = params.previousQuantity - params.quantity;

  return {
    quantity,
    averageCost: quantity === 0 ? 0 : params.previousAverageCost,
  };
}
