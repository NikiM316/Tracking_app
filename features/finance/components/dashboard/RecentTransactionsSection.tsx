import type { RecentTransaction } from "@/features/finance/actions";

type RecentTransactionsSectionProps = {
  transactions: RecentTransaction[];
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

export function RecentTransactionsSection({ transactions }: RecentTransactionsSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-lg font-semibold text-zinc-50">Recent Transactions</h2>

      {transactions.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          No transactions yet. Log an expense or income entry to see it here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800">
          {transactions.map((transaction) => {
            const { sign, className } = signedAmount(transaction);
            return (
              <li key={transaction.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {transactionLabel(transaction)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(transaction.date)} · {transaction.accountName}
                    {transaction.categoryName && transaction.type !== "transfer"
                      ? ` · ${transaction.categoryName}`
                      : ""}
                  </p>
                </div>
                <p className={`shrink-0 pl-3 text-sm font-semibold tabular-nums ${className}`}>
                  {sign}
                  {formatCurrency(transaction.amount, transaction.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
