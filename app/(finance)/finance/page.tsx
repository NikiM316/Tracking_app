import { CashBalancesSection } from "@/features/finance/components/dashboard/CashBalancesSection";
import { MonthlyActivityFeed } from "@/features/finance/components/dashboard/MonthlyActivityFeed";
import { NetWorthSummary } from "@/features/finance/components/dashboard/NetWorthSummary";
import { PortfolioHoldingsSection } from "@/features/finance/components/dashboard/PortfolioHoldingsSection";
import { getAccounts } from "@/features/finance/actions/accounts";
import { getCategories } from "@/features/finance/actions/categories";
import { getPortfolioHoldings } from "@/features/finance/actions/investments";
import { getPortfolios } from "@/features/finance/actions/portfolios";
import { getMonthActivity } from "@/features/finance/actions/transactions";

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
