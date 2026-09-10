import { AppHeader } from "@/features/core/components/AppHeader";
import { AppShell } from "@/features/core/components/AppShell";
import { BottomNav } from "@/features/core/components/BottomNav";
import { getTodaysWorkout } from "@/features/fitness/actions/workout";
import { FITNESS_NAV_ITEMS } from "@/features/fitness/components/layout/nav-items";
import { getProgramDay } from "@/lib/program/cycle";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let cycleDay = 1;
  let headerLabel = "Hybrid Cycle";

  try {
    const todaysWorkout = await getTodaysWorkout();
    cycleDay = todaysWorkout.cycle_day;
    headerLabel = getProgramDay(cycleDay)?.label ?? "Hybrid Cycle";
  } catch (error) {
    // Keep the gym shell (header + nav) up if a transient fetch still fails
    // after retries. Nested pages will hit app/(fitness)/error.tsx.
    console.error("Failed to resolve today's workout for the gym shell:", error);
  }

  return (
    <AppShell
      header={
        <AppHeader
          eyebrow={`Day ${cycleDay} of 14`}
          title={headerLabel}
          subtitle="14-day hybrid fitness cycle"
        />
      }
      nav={<BottomNav items={FITNESS_NAV_ITEMS} ariaLabel="Fitness navigation" />}
    >
      {children}
    </AppShell>
  );
}
