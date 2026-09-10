import { AppHeader } from "@/features/core/components/AppHeader";
import { AppShell } from "@/features/core/components/AppShell";
import { BottomNav } from "@/features/core/components/BottomNav";
import { MONK_NAV_ITEMS } from "@/features/monk/components/layout/nav-items";

export default function MonkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell
      header={
        <AppHeader
          eyebrow="Discipline"
          title="Monk Mode"
          subtitle="180-day discipline protocol"
        />
      }
      nav={<BottomNav items={MONK_NAV_ITEMS} ariaLabel="Monk Mode navigation" />}
    >
      {children}
    </AppShell>
  );
}
