import { BottomNav } from "./BottomNav";
import { CycleDayHeader } from "./CycleDayHeader";

type AppShellProps = {
  children: React.ReactNode;
  cycleDay: number;
  headerLabel?: string;
  headerSubtitle?: string;
  workoutId?: string | null;
};

export function AppShell({
  children,
  cycleDay,
  headerLabel,
  headerSubtitle,
  workoutId,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
      <CycleDayHeader
        cycleDay={cycleDay}
        label={headerLabel}
        subtitle={headerSubtitle}
        workoutId={workoutId}
      />
      <main
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-28 pt-6"
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
