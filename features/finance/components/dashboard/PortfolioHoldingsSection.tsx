import Link from "next/link";

import type { HoldingWithDetails } from "@/features/finance/actions";

type PortfolioHoldingsSectionProps = {
  holdings: HoldingWithDetails[];
  portfolioCount: number;
};

const SECURITY_TYPE_LABELS: Record<HoldingWithDetails["securityType"], string> = {
  stock: "Stock",
  etf: "ETF",
  mutual_fund: "Mutual Fund",
  bond: "Bond",
  crypto: "Crypto",
  commodity: "Commodity",
  real_estate: "Real Estate",
  other: "Other",
};

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(quantity);
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function PortfolioHoldingsSection({
  holdings,
  portfolioCount,
}: PortfolioHoldingsSectionProps) {
  const visibleHoldings = holdings.filter((holding) => holding.quantity > 0);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-50">Investment Portfolio</h2>
        {portfolioCount > 0 ? (
          <div className="flex items-center gap-3">
            <Link
              href="/finance/portfolios/new"
              className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Add Portfolio
            </Link>
            <Link
              href="/finance/investments/new"
              className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Log Trade
            </Link>
          </div>
        ) : null}
      </div>

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
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-relaxed text-zinc-400">
            No holdings yet. Log a buy to populate this portfolio.
          </p>
          <Link
            href="/finance/investments/new"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
          >
            Log Trade
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800">
          {visibleHoldings.map((holding) => (
            <li key={holding.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {holding.symbol}
                  <span className="ml-2 text-xs font-normal text-zinc-500">{holding.name}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  {SECURITY_TYPE_LABELS[holding.securityType]} · {holding.portfolioName}
                </p>
              </div>
              <div className="shrink-0 pl-3 text-right">
                <p className="text-sm font-semibold tabular-nums text-zinc-100">
                  {formatQuantity(holding.quantity)}
                </p>
                <p className="text-xs text-zinc-500">
                  avg {formatCurrency(holding.averageCost, holding.currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
