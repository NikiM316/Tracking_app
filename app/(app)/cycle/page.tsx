export default function CyclePage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">14-Day Cycle</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Cycle overview grid coming soon. Each day will show its programmed
          exercises from the fixed hybrid schedule.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 14 }, (_, index) => {
          const day = index + 1;

          return (
            <div
              key={day}
              className="flex min-h-16 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm font-medium text-zinc-300"
            >
              Day {day}
            </div>
          );
        })}
      </div>
    </section>
  );
}
