import Link from "next/link";

import type { HoldingWithDetails } from "@/features/finance/types";

type PortfolioHoldingsSectionProps = {
  holdings: HoldingWithDetails[];
  portfolioCount: number;
};

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(quantity);
}

function formatEur(amount: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `€${amount.toFixed(2)}`;
  }
}

function formatSignedEur(amount: number): string {
  const formatted = formatEur(Math.abs(amount));
  if (amount > 0) {
    return `+${formatted}`;
  }
  if (amount < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

function formatPercent(value: number): string {
  const formatted = `${Math.abs(value).toFixed(2)}%`;
  if (value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

function pnlBadgeClass(amount: number | null): string {
  if (amount == null || amount === 0) {
    return "bg-zinc-800 text-zinc-300";
  }
  if (amount > 0) {
    return "bg-emerald-500/10 text-emerald-400";
  }
  return "bg-rose-500/10 text-rose-400";
}

function PnlBadge({
  amount,
  percentage,
}: {
  amount: number | null;
  percentage: number | null;
}) {
  if (amount == null || percentage == null) {
    return (
      <span className="inline-flex rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400">
        P/L unavailable
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${pnlBadgeClass(amount)}`}
    >
      <span>{formatSignedEur(amount)}</span>
      <span aria-hidden="true">·</span>
      <span>{formatPercent(percentage)}</span>
    </span>
  );
}

export function PortfolioHoldingsSection({
  holdings,
  portfolioCount,
}: PortfolioHoldingsSectionProps) {
  const visibleHoldings = holdings.filter((holding) => holding.quantity > 0);
  const totalAssetValue = visibleHoldings.reduce(
    (sum, holding) => sum + (holding.currentValue ?? 0),
    0,
  );
  const totalInvested = visibleHoldings.reduce((sum, holding) => sum + holding.totalInvested, 0);
  const hasLiveValues = visibleHoldings.some((holding) => holding.currentValue != null);
  const overallPnlAmount = hasLiveValues ? totalAssetValue - totalInvested : null;
  const overallPnlPercentage =
    overallPnlAmount != null && totalInvested > 0
      ? (overallPnlAmount / totalInvested) * 100
      : overallPnlAmount != null
        ? 0
        : null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-50">Investment Portfolio</h2>
        {portfolioCount > 0 ? (
          <Link
            href="/finance/portfolios/new"
            className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Add Portfolio
          </Link>
        ) : null}
      </div>

      {visibleHoldings.length > 0 ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs text-zinc-500">Total asset value</p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-zinc-50">
              {hasLiveValues ? formatEur(totalAssetValue) : "—"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm text-zinc-400">
              Invested{" "}
              <span className="font-semibold tabular-nums text-zinc-200">
                {formatEur(totalInvested)}
              </span>
            </p>
            <PnlBadge amount={overallPnlAmount} percentage={overallPnlPercentage} />
          </div>
        </div>
      ) : null}

      {portfolioCount > 0 ? (
        <Link
          href="/finance/investments/new"
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
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
              d="M3 17l6-6 4 4 8-8M14 7h7v7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Log Trade
        </Link>
      ) : null}

      {portfolioCount === 0 ? (
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-relaxed text-zinc-400">
            No portfolios yet. Create one to start tracking crypto, stocks, and other assets.
          </p>
          <Link
            href="/finance/portfolios/new"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            Add Portfolio
          </Link>
        </div>
      ) : visibleHoldings.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          No holdings yet. Log a buy to populate this portfolio.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800">
          {visibleHoldings.map((holding) => (
            <li key={holding.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {holding.symbol}
                    <span className="font-normal text-zinc-500"> · {holding.portfolioName}</span>
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-zinc-400">
                    {formatQuantity(holding.quantity)} {holding.symbol}
                    {holding.livePriceEur != null
                      ? ` @ ${formatEur(holding.livePriceEur)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-zinc-500">
                    Invested: {formatEur(holding.totalInvested)} @{" "}
                    {formatEur(holding.averageCost)}/unit
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-zinc-50">
                    {holding.currentValue != null ? formatEur(holding.currentValue) : "—"}
                  </p>
                  <div className="mt-2">
                    <PnlBadge amount={holding.pnlAmount} percentage={holding.pnlPercentage} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
