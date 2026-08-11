import { HomeLink } from "@/features/core/components/HomeLink";

type FinanceHeaderProps = {
  title?: string;
  subtitle?: string;
};

export function FinanceHeader({
  title = "Finance",
  subtitle = "Cashflow, budgets & investing",
}: FinanceHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-4">
        <div className="flex items-start gap-2">
          <HomeLink />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Overview
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50">
              {title}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
