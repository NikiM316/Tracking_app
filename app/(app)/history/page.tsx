export default function HistoryPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Workout History</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Past workouts and set logs will appear here once Server Actions are
          wired in Phase 4.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
        <p className="text-sm text-zinc-500">No workouts logged yet</p>
      </div>
    </section>
  );
}
