import { AppShell } from "@/components/layout/AppShell";
import { getProgramDay } from "@/lib/program/cycle";
import { getCycleAnchorDate, getCycleDay } from "@/lib/utils/cycle-day";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cycleDay = getCycleDay(getCycleAnchorDate());
  const programDay = getProgramDay(cycleDay);

  return (
    <AppShell
      cycleDay={cycleDay}
      headerLabel={programDay?.label ?? "Hybrid Cycle"}
      headerSubtitle="14-day hybrid fitness cycle"
    >
      {children}
    </AppShell>
  );
}
