import { BottomNav } from "./BottomNav";
import { FinanceHeader } from "./FinanceHeader";

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export function AppShell({ children, title, subtitle }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
      <FinanceHeader title={title} subtitle={subtitle} />
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
