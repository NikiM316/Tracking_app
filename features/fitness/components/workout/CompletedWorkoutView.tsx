import { WorkoutCompleteSummary } from "@/features/fitness/components/workout/WorkoutCompleteSummary";
import type { LocalSet } from "@/features/fitness/components/workout/SetRow";
import type { Exercise } from "@/lib/supabase/types";

type CompletedWorkoutViewProps = {
  programLabel: string | null;
  completedAt: string;
  exercises: Exercise[];
  setsByExercise: Record<string, LocalSet[]>;
  notesByExercise: Record<string, string>;
};

export function CompletedWorkoutView({
  programLabel,
  completedAt,
  exercises,
  setsByExercise,
  notesByExercise,
}: CompletedWorkoutViewProps) {
  return (
    <WorkoutCompleteSummary
      programLabel={programLabel}
      completedAt={completedAt}
      exercises={exercises}
      setsByExercise={setsByExercise}
      notesByExercise={notesByExercise}
    />
  );
}
