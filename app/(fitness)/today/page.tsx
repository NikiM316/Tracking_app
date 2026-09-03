import { Suspense } from "react";

import { WorkoutForm } from "@/features/fitness/components/workout/WorkoutForm";
import { TodayPageSkeleton } from "@/features/fitness/components/layout/TodayPageSkeleton";
import { getTodayWorkoutData } from "@/features/fitness/actions/workout";

export const dynamic = "force-dynamic";

async function TodayWorkout() {
  const data = await getTodayWorkoutData();

  return <WorkoutForm key={data.cycleDay} initialData={data} />;
}

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayPageSkeleton />}>
      <TodayWorkout />
    </Suspense>
  );
}
