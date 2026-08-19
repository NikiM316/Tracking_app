import Link from "next/link";

import type { AccountWithBalance } from "@/features/finance/types";

type CashBalancesSectionProps = {
  accounts: AccountWithBalance[];
};

const ACCOUNT_TYPE_LABELS: Record<AccountWithBalance["account_type"], string> = {
  checking: "Checking",
  savings: "Savings",
  cash: "Cash",
  credit_card: "Credit Card",
  loan: "Loan",
  brokerage: "Brokerage Cash",
  other: "Other",
};

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function CashBalancesSection({ accounts }: CashBalancesSectionProps) {
  const totalsByCurrency = new Map<string, number>();
  for (const account of accounts) {
    totalsByCurrency.set(
      account.currency,
      (totalsByCurrency.get(account.currency) ?? 0) + account.balance,
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-50">Net Worth / Cash Balances</h2>
        {accounts.length > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {accounts.length} account{accounts.length === 1 ? "" : "s"}
            </span>
            <Link
              href="/finance/accounts/new"
              className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Add
            </Link>
          </div>
        ) : null}
      </div>

      {accounts.length === 0 ? (
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-relaxed text-zinc-400">
            No accounts yet. Add a checking, savings, or cash account to start tracking
            your balances.
          </p>
          <Link
            href="/finance/accounts/new"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            Add Account
          </Link>
        </div>
      ) : (
        <>
          {totalsByCurrency.size > 0 ? (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {[...totalsByCurrency.entries()].map(([currency, total]) => (
                <p
                  key={currency}
                  className={`text-2xl font-bold tracking-tight ${
                    total < 0 ? "text-rose-400" : "text-zinc-50"
                  }`}
                >
                  {formatCurrency(total, currency)}
                </p>
              ))}
            </div>
          ) : null}

          <ul className="mt-4 divide-y divide-zinc-800">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{account.name}</p>
                  <p className="text-xs text-zinc-500">
                    {ACCOUNT_TYPE_LABELS[account.account_type]}
                    {account.institution ? ` · ${account.institution}` : ""}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    account.balance < 0 ? "text-rose-400" : "text-zinc-100"
                  }`}
                >
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
