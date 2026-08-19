import { CashBalancesSection } from "@/features/finance/components/dashboard/CashBalancesSection";
import { NetWorthSummary } from "@/features/finance/components/dashboard/NetWorthSummary";
import { PortfolioHoldingsSection } from "@/features/finance/components/dashboard/PortfolioHoldingsSection";
import { RecentTransactionsSection } from "@/features/finance/components/dashboard/RecentTransactionsSection";
import {
  getAccounts,
  getCategories,
  getPortfolioHoldings,
  getPortfolios,
  getRecentTransactions,
} from "@/features/finance/actions";

export const dynamic = "force-dynamic";

export default async function FinanceHomePage() {
  const [accounts, transactions, holdings, portfolios, categories] = await Promise.all([
    getAccounts(),
    getRecentTransactions(),
    getPortfolioHoldings(),
    getPortfolios(),
    getCategories(),
  ]);

  return (
    <section className="space-y-4">
      <NetWorthSummary accounts={accounts} holdings={holdings} />
      <CashBalancesSection accounts={accounts} />
      <RecentTransactionsSection transactions={transactions} categories={categories} />
      <PortfolioHoldingsSection
        holdings={holdings}
        portfolioCount={portfolios.length}
      />
    </section>
  );
}
