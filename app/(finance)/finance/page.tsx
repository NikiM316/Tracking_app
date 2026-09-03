import { CashBalancesSection } from "@/features/finance/components/dashboard/CashBalancesSection";
import { MonthlyActivityFeed } from "@/features/finance/components/dashboard/MonthlyActivityFeed";
import { NetWorthSummary } from "@/features/finance/components/dashboard/NetWorthSummary";
import { PortfolioHoldingsSection } from "@/features/finance/components/dashboard/PortfolioHoldingsSection";
import {
  getAccounts,
  getCategories,
  getMonthActivity,
  getPortfolioHoldings,
  getPortfolios,
} from "@/features/finance/actions";

export const dynamic = "force-dynamic";

export default async function FinanceHomePage() {
  const [accounts, activity, holdings, portfolios, categories] = await Promise.all([
    getAccounts(),
    getMonthActivity(),
    getPortfolioHoldings(),
    getPortfolios(),
    getCategories(),
  ]);

  return (
    <section className="space-y-4">
      <NetWorthSummary accounts={accounts} holdings={holdings} />
      <CashBalancesSection accounts={accounts} />
      <MonthlyActivityFeed initialActivity={activity} categories={categories} />
      <PortfolioHoldingsSection
        holdings={holdings}
        portfolioCount={portfolios.length}
      />
    </section>
  );
}
