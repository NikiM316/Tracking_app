import type { AccountWithBalance } from "@/features/finance/actions";

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
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-zinc-50">Net Worth / Cash Balances</h2>
        {accounts.length > 0 ? (
          <span className="text-xs text-zinc-500">
            {accounts.length} account{accounts.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {accounts.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          No accounts yet. Add a checking, savings, or cash account to start tracking
          your balances.
        </p>
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
