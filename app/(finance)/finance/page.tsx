import Link from "next/link";

import { CashBalancesSection } from "@/features/finance/components/dashboard/CashBalancesSection";
import { PortfolioHoldingsSection } from "@/features/finance/components/dashboard/PortfolioHoldingsSection";
import { RecentTransactionsSection } from "@/features/finance/components/dashboard/RecentTransactionsSection";
import {
  getAccounts,
  getPortfolioHoldings,
  getPortfolios,
  getRecentTransactions,
} from "@/features/finance/actions";

export const dynamic = "force-dynamic";

export default async function FinanceHomePage() {
  const [accounts, transactions, holdings, portfolios] = await Promise.all([
    getAccounts(),
    getRecentTransactions(),
    getPortfolioHoldings(),
    getPortfolios(),
  ]);

  return (
    <>
      <section className="space-y-4 pb-20">
        <CashBalancesSection accounts={accounts} />
        <RecentTransactionsSection transactions={transactions} />
        <PortfolioHoldingsSection
          holdings={holdings}
          portfolioCount={portfolios.length}
        />
      </section>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-full max-w-md flex-col items-end gap-3 px-4"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href="/finance/import"
          aria-label="Import CSV"
          className="pointer-events-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 shadow-lg shadow-black/30 transition-colors hover:bg-zinc-800"
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
          href="/finance/investments/new"
          aria-label="Log trade"
          className="pointer-events-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 shadow-lg shadow-black/30 transition-colors hover:bg-zinc-800"
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
        <Link
          href="/finance/transactions/new"
          aria-label="New transaction"
          className="pointer-events-auto inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-400"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
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
    </>
  );
}
