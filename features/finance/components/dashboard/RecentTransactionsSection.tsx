import Link from "next/link";

import type { RecentTransaction } from "@/features/finance/types";
import {
  CategoryTransactionsAccordion,
  type CategoryTransactionGroup,
} from "@/features/finance/components/dashboard/CategoryTransactionsAccordion";
import type { FinanceCategory } from "@/lib/supabase/finance-types";

type RecentTransactionsSectionProps = {
  transactions: RecentTransaction[];
  categories: FinanceCategory[];
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

function categoryLabel(transaction: RecentTransaction): string {
  const name = transaction.categoryName?.trim();
  if (name) {
    return name;
  }
  if (transaction.type === "transfer") {
    return "Transfers";
  }
  return "Uncategorized";
}

function groupTransactionsByCategory(
  transactions: RecentTransaction[],
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

const headerButtonClass =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors";

export function RecentTransactionsSection({
  transactions,
  categories,
}: RecentTransactionsSectionProps) {
  const groups = groupTransactionsByCategory(transactions);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Recent Transactions</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          {transactions.length === 0
            ? "No transactions yet. Log an expense or income entry to see it here."
            : "Tap a category to see the transactions that make up its total."}
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/finance/import"
            className={`${headerButtonClass} border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800`}
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              viewBox="0 0 24 24"
            >
              <path
                d="M12 16V4m0 0L7 9m5-5l5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Import CSV
          </Link>
          <Link
            href="/finance/transactions/new"
            className={`${headerButtonClass} bg-emerald-500 text-zinc-950 hover:bg-emerald-400`}
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New Transaction
          </Link>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
          <p className="text-sm text-zinc-500">No transactions logged yet</p>
        </div>
      ) : (
        <CategoryTransactionsAccordion groups={groups} categories={categories} />
      )}
    </section>
  );
}
