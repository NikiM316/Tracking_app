"use client";

import { useState } from "react";

import type { RecentTransaction } from "@/features/finance/types";
import { EditTransactionModal } from "@/features/finance/components/dashboard/EditTransactionModal";
import type { FinanceCategory } from "@/lib/supabase/finance-types";

export type CategoryTransactionGroup = {
  key: string;
  label: string;
  totalsByCurrency: { currency: string; total: number }[];
  transactions: RecentTransaction[];
};

type CategoryTransactionsAccordionProps = {
  groups: CategoryTransactionGroup[];
  categories: FinanceCategory[];
};

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${dateString}T00:00:00`),
  );
}

function signedAmount(transaction: RecentTransaction): { sign: string; className: string } {
  if (transaction.type === "income") {
    return { sign: "+", className: "text-emerald-400" };
  }
  if (transaction.type === "expense") {
    return { sign: "-", className: "text-zinc-100" };
  }
  return { sign: "", className: "text-sky-400" };
}

function transactionLabel(transaction: RecentTransaction): string {
  if (transaction.type === "transfer") {
    return transaction.transferAccountName
      ? `Transfer to ${transaction.transferAccountName}`
      : "Transfer";
  }
  return transaction.payee || transaction.categoryName || "Uncategorized";
}

function formatSignedTotal(total: number, currency: string): { text: string; className: string } {
  const formatted = formatCurrency(Math.abs(total), currency);
  if (total > 0) {
    return { text: `+${formatted}`, className: "text-emerald-400" };
  }
  if (total < 0) {
    return { text: `-${formatted}`, className: "text-zinc-100" };
  }
  return { text: formatted, className: "text-zinc-400" };
}

export function CategoryTransactionsAccordion({
  groups,
  categories,
}: CategoryTransactionsAccordionProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<RecentTransaction | null>(
    null,
  );

  function toggleCategory(key: string) {
    setExpandedKey((current) => (current === key ? null : key));
  }

  return (
    <>
      <div className="space-y-3">
        {groups.map((group) => {
        const isExpanded = expandedKey === group.key;
        const countLabel =
          group.transactions.length === 1
            ? "1 transaction"
            : `${group.transactions.length} transactions`;

        return (
          <section
            key={group.key}
            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
          >
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => toggleCategory(group.key)}
              className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {countLabel}
                </p>
                <h3 className="mt-1 truncate text-base font-semibold text-zinc-50">
                  {group.label}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  {group.totalsByCurrency.map(({ currency, total }) => {
                    const signed = formatSignedTotal(total, currency);
                    return (
                      <p
                        key={currency}
                        className={`text-sm font-semibold tabular-nums ${signed.className}`}
                      >
                        {signed.text}
                      </p>
                    );
                  })}
                </div>
                <svg
                  aria-hidden="true"
                  className={`h-5 w-5 text-zinc-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 9l-7 7-7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>

            {isExpanded ? (
              <div className="border-t border-zinc-800 px-5 py-4">
                <ul className="space-y-2">
                  {group.transactions.map((transaction) => {
                    const { sign, className } = signedAmount(transaction);
                    return (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-100">
                            {transactionLabel(transaction)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatDate(transaction.date)} · {transaction.accountName}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 pl-2">
                          <p className={`text-sm font-semibold tabular-nums ${className}`}>
                            {sign}
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          <button
                            type="button"
                            aria-label={`Edit ${transactionLabel(transaction)}`}
                            onClick={() => setEditingTransaction(transaction)}
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
                          >
                            <svg
                              aria-hidden="true"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.75}
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.414-9.414a2 2 0 000-2.828l-2.172-2.172a2 2 0 00-2.828 0L4.293 14.707A1 1 0 004 15.414V20z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}
      </div>

      {editingTransaction ? (
        <EditTransactionModal
          key={editingTransaction.id}
          transaction={editingTransaction}
          categories={categories}
          onClose={() => setEditingTransaction(null)}
        />
      ) : null}
    </>
  );
}
