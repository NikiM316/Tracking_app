import { WorkoutForm } from "@/features/fitness/components/workout/WorkoutForm";
import { getTodayWorkoutData } from "@/features/fitness/actions/workout";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const data = await getTodayWorkoutData();

  return <WorkoutForm key={data.cycleDay} initialData={data} />;
}
