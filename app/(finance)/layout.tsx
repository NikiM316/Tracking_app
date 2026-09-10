import { AppHeader } from "@/features/core/components/AppHeader";
import { AppShell } from "@/features/core/components/AppShell";
import { BottomNav } from "@/features/core/components/BottomNav";
import { FINANCE_NAV_ITEMS } from "@/features/finance/components/layout/nav-items";

export default function FinanceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell
      header={
        <AppHeader
          eyebrow="Overview"
          title="Finance"
          subtitle="Cashflow, budgets & investing"
        />
      }
      nav={<BottomNav items={FINANCE_NAV_ITEMS} ariaLabel="Finance navigation" />}
    >
      {children}
    </AppShell>
  );
}
