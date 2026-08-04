import { ConsistencyCalendar } from "@/components/analytics/ConsistencyCalendar";
import { ProgressionChart } from "@/components/analytics/ProgressionChart";
import {
  getConsistencyCalendar,
  getExercisesForAnalytics,
} from "@/lib/actions/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [calendarDays, exercises] = await Promise.all([
    getConsistencyCalendar(),
    getExercisesForAnalytics(),
  ]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Consistency</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Training days since your cycle start.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <ConsistencyCalendar days={calendarDays} />
      </div>

      {exercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
          <p className="text-sm text-zinc-500">No exercises found yet.</p>
        </div>
      ) : (
        <ProgressionChart exercises={exercises} />
      )}
    </section>
  );
}
