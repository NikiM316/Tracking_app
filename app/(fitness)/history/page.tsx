import { WorkoutHistoryAccordion } from "@/features/fitness/components/history/WorkoutHistoryAccordion";
import { getWorkoutHistory } from "@/features/fitness/actions/history";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const entries = await getWorkoutHistory();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Workout History</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {entries.length === 0
            ? "Finish a workout on Today to see it appear here."
            : `${entries.length} finished ${entries.length === 1 ? "workout" : "workouts"}.`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
          <p className="text-sm text-zinc-500">No workouts logged yet</p>
        </div>
      ) : (
        <WorkoutHistoryAccordion entries={entries} />
      )}
    </section>
  );
}
