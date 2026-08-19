import type { AccountWithBalance, HoldingWithDetails } from "@/features/finance/types";

type NetWorthSummaryProps = {
  accounts: AccountWithBalance[];
  holdings: HoldingWithDetails[];
};

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function NetWorthSummary({ accounts, holdings }: NetWorthSummaryProps) {
  const cashByCurrency = new Map<string, number>();
  for (const account of accounts) {
    cashByCurrency.set(
      account.currency,
      (cashByCurrency.get(account.currency) ?? 0) + account.balance,
    );
  }

  const cashEur = cashByCurrency.get("EUR") ?? 0;
  const portfolioEur = holdings.reduce((sum, holding) => {
    if (holding.quantity <= 0) {
      return sum;
    }
    return sum + (holding.currentValue ?? holding.totalInvested);
  }, 0);
  const totalEur = cashEur + portfolioEur;
  const otherCash = [...cashByCurrency.entries()].filter(([currency]) => currency !== "EUR");

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
        Total Net Worth
      </p>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${
          totalEur < 0 ? "text-rose-400" : "text-zinc-50"
        }`}
      >
        {formatCurrency(totalEur, "EUR")}
      </p>
      <p className="mt-2 text-sm text-zinc-400">
        Cash {formatCurrency(cashEur, "EUR")}
        {" · "}
        Investments {formatCurrency(portfolioEur, "EUR")}
      </p>
      {otherCash.length > 0 ? (
        <p className="mt-1 text-xs text-zinc-500">
          Plus{" "}
          {otherCash
            .map(([currency, amount]) => formatCurrency(amount, currency))
            .join(" · ")}{" "}
          in other cash accounts
        </p>
      ) : null}
    </section>
  );
}
