import type { HoldingWithDetails } from "@/features/finance/actions";

type PortfolioHoldingsSectionProps = {
  holdings: HoldingWithDetails[];
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

export function PortfolioHoldingsSection({ holdings }: PortfolioHoldingsSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-lg font-semibold text-zinc-50">Investment Portfolio</h2>

      {holdings.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          No holdings yet. Add a portfolio and log a buy to start tracking investments.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800">
          {holdings.map((holding) => (
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
