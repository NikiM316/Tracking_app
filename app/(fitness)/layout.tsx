import { AppShell } from "@/features/fitness/components/layout/AppShell";
import { getTodaysWorkout } from "@/features/fitness/actions/workout";
import { getProgramDay } from "@/lib/program/cycle";
import { getCycleAnchorDate, getCycleDay } from "@/lib/utils/cycle-day";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const calendarCycleDay = getCycleDay(getCycleAnchorDate());
  const todaysWorkout = await getTodaysWorkout();
  const cycleDay = todaysWorkout?.cycle_day ?? calendarCycleDay;
  const programDay = getProgramDay(cycleDay);

  return (
    <AppShell
      cycleDay={cycleDay}
      workoutId={todaysWorkout?.id}
      headerLabel={programDay?.label ?? "Hybrid Cycle"}
      headerSubtitle="14-day hybrid fitness cycle"
    >
      {children}
    </AppShell>
  );
}
