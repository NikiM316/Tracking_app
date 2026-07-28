type CycleDayHeaderProps = {
  cycleDay: number;
  label?: string;
  subtitle?: string;
};

export function CycleDayHeader({
  cycleDay,
  label,
  subtitle,
}: CycleDayHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Day {cycleDay} of 14
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          {label ?? "Hybrid Cycle"}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
