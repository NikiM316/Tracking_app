import Link from "next/link";

import type { MonthActivity } from "@/features/finance/lib/activity";
import { CategoryTransactionsAccordion } from "@/features/finance/components/dashboard/CategoryTransactionsAccordion";
import { formatMonthLabel } from "@/features/finance/lib/months";
import type { FinanceCategory } from "@/lib/supabase/finance-types";

type MonthlyActivitySectionProps = {
  activity: MonthActivity;
  categories: FinanceCategory[];
  /** Import / new-transaction actions belong on the current month only. */
  showActions?: boolean;
};

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

const headerButtonClass =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors";

export function MonthlyActivitySection({
  activity,
  categories,
  showActions = false,
}: MonthlyActivitySectionProps) {
  const { month, transactions, spentByCurrency, categoryGroups } = activity;
  const monthLabel = formatMonthLabel(month);
  const spentDisplay =
    spentByCurrency.length > 0
      ? spentByCurrency
      : [{ currency: "EUR", amount: 0 }];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {monthLabel}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-50">Total spent</h2>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {spentDisplay.map(({ currency, amount }) => (
            <p
              key={currency}
              className="text-3xl font-bold tracking-tight tabular-nums text-zinc-50"
            >
              {formatCurrency(amount, currency)}
            </p>
          ))}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {transactions.length === 0
            ? showActions
              ? `No transactions in ${monthLabel} yet. Log an expense or income entry to see it here.`
              : `No transactions in ${monthLabel}.`
            : "Category totals cover this month only. Tap a category to see the transactions that make up its total."}
        </p>
        {showActions ? (
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
        ) : null}
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
          <p className="text-sm text-zinc-500">No transactions logged this month</p>
        </div>
      ) : (
        <CategoryTransactionsAccordion groups={categoryGroups} categories={categories} />
      )}
    </section>
  );
}
