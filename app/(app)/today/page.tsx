import { WorkoutForm } from "@/components/workout/WorkoutForm";
import { getTodayWorkoutData } from "@/lib/actions/workout";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const data = await getTodayWorkoutData();

  return <WorkoutForm initialData={data} />;
}
