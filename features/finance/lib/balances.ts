import type { FinanceInvestmentTxType } from "@/lib/supabase/finance-types";

/**
 * Balances are never stored on finance_accounts; they are always derived as
 * opening_balance plus the signed sum of the account's cashflow transactions.
 * Keeping that derivation here (rather than inline in the server action) means
 * the sign conventions can be tested without a database.
 */

/** The transaction fields balance derivation actually needs. */
export type BalanceMovementInput = {
  account_id: string;
  type: string;
  amount: number | string;
  transfer_account_id?: string | null;
};

/**
 * Sums the signed cash movement per account id.
 *
 * Sign convention: `amount` is always stored positive and the direction comes
 * from `type` — income credits the account, expense debits it, and a transfer
 * debits `account_id` while crediting `transfer_account_id`. A transfer with
 * no `transfer_account_id` is skipped rather than counted one-sided, which
 * would silently unbalance the books.
 */
export function netMovementByAccount(
  transactions: readonly BalanceMovementInput[],
): Map<string, number> {
  const netMovementByAccountId = new Map<string, number>();

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
