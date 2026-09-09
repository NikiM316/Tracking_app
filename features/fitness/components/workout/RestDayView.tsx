export function RestDayView({ cycleDay }: { cycleDay: number }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-lg font-semibold text-zinc-50">Rest / unprogrammed day</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Day {cycleDay} is not in the program yet. Days 3–14 will be added later.
      </p>
    </section>
  );
}
