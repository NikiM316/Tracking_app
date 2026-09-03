import type { CalendarMonth } from "@/features/finance/lib/months";
import type { RecentTransaction } from "@/features/finance/types";

export type CurrencyAmount = {
  currency: string;
  amount: number;
};

export type CategoryTransactionGroup = {
  key: string;
  label: string;
  totalsByCurrency: { currency: string; total: number }[];
  transactions: RecentTransaction[];
};

function signedContribution(transaction: RecentTransaction): number {
  if (transaction.type === "income") {
    return transaction.amount;
  }
  if (transaction.type === "expense") {
    return -transaction.amount;
  }
  return 0;
}

export function categoryLabel(transaction: RecentTransaction): string {
  const name = transaction.categoryName?.trim();
  if (name) {
    return name;
  }
  if (transaction.type === "transfer") {
    return "Transfers";
  }
  return "Uncategorized";
}

/**
 * Expense totals by currency. Transfers are a wash and income is not spent.
 */
export function spentByCurrency(
  transactions: readonly RecentTransaction[],
): CurrencyAmount[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }
    totals.set(
      transaction.currency,
      (totals.get(transaction.currency) ?? 0) + transaction.amount,
    );
  }

  return [...totals.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type MonthActivity = {
  month: CalendarMonth;
  transactions: RecentTransaction[];
  spentByCurrency: CurrencyAmount[];
  categoryGroups: CategoryTransactionGroup[];
};

export function buildMonthActivity(
  month: CalendarMonth,
  transactions: RecentTransaction[],
): MonthActivity {
  return {
    month,
    transactions,
    spentByCurrency: spentByCurrency(transactions),
    categoryGroups: groupTransactionsByCategory(transactions),
  };
}

export function groupTransactionsByCategory(
  transactions: readonly RecentTransaction[],
): CategoryTransactionGroup[] {
  const grouped = new Map<string, RecentTransaction[]>();

  for (const transaction of transactions) {
    const label = categoryLabel(transaction);
    const existing = grouped.get(label);
    if (existing) {
      existing.push(transaction);
    } else {
      grouped.set(label, [transaction]);
    }
  }

  return [...grouped.entries()]
    .map(([label, categoryTransactions]) => {
      const totals = new Map<string, number>();
      for (const transaction of categoryTransactions) {
        totals.set(
          transaction.currency,
          (totals.get(transaction.currency) ?? 0) + signedContribution(transaction),
        );
      }

      return {
        key: label,
        label,
        totalsByCurrency: [...totals.entries()].map(([currency, total]) => ({
          currency,
          total,
        })),
        transactions: categoryTransactions,
      };
    })
    .sort((a, b) => {
      const absA = a.totalsByCurrency.reduce((sum, item) => sum + Math.abs(item.total), 0);
      const absB = b.totalsByCurrency.reduce((sum, item) => sum + Math.abs(item.total), 0);
      return absB - absA;
    });
}
