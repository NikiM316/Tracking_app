import { CashBalancesSection } from "@/features/finance/components/dashboard/CashBalancesSection";
import { PortfolioHoldingsSection } from "@/features/finance/components/dashboard/PortfolioHoldingsSection";
import { RecentTransactionsSection } from "@/features/finance/components/dashboard/RecentTransactionsSection";
import {
  getAccounts,
  getPortfolioHoldings,
  getRecentTransactions,
} from "@/features/finance/actions";

export const dynamic = "force-dynamic";

export default async function FinanceHomePage() {
  const [accounts, transactions, holdings] = await Promise.all([
    getAccounts(),
    getRecentTransactions(),
    getPortfolioHoldings(),
  ]);

  return (
    <section className="space-y-4">
      <CashBalancesSection accounts={accounts} />
      <RecentTransactionsSection transactions={transactions} />
      <PortfolioHoldingsSection holdings={holdings} />
    </section>
  );
}
