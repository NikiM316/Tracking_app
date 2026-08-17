import { AppShell } from "@/features/fitness/components/layout/AppShell";
import { getTodaysWorkout } from "@/features/fitness/actions/workout";
import { getProgramDay } from "@/lib/program/cycle";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let cycleDay = 1;
  let workoutId: string | null = null;
  let headerLabel = "Hybrid Cycle";

  try {
    const todaysWorkout = await getTodaysWorkout();
    cycleDay = todaysWorkout.cycle_day;
    workoutId = todaysWorkout.id;
    headerLabel = getProgramDay(cycleDay)?.label ?? "Hybrid Cycle";
  } catch (error) {
    // Keep the gym shell (header + nav) up if a transient fetch still fails
    // after retries. Nested pages will hit app/(fitness)/error.tsx.
    console.error("Failed to resolve today's workout for the gym shell:", error);
  }

  return (
    <AppShell
      cycleDay={cycleDay}
      workoutId={workoutId}
      headerLabel={headerLabel}
      headerSubtitle="14-day hybrid fitness cycle"
    >
      {children}
    </AppShell>
  );
}
