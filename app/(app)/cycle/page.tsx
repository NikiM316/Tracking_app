import { CycleDayAccordion } from "@/components/cycle/CycleDayAccordion";
import { getCycleOverviewData } from "@/lib/actions/cycle";

export const dynamic = "force-dynamic";

export default async function CyclePage() {
  const { currentCycleDay, days } = await getCycleOverviewData();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">14-Day Cycle</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Tap a day to see its scheduled exercises. You&apos;re on day{" "}
          {currentCycleDay} of 14.
        </p>
      </div>

      <CycleDayAccordion days={days} currentCycleDay={currentCycleDay} />
    </section>
  );
}
