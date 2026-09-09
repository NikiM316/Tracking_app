import { Button } from "@/features/core/components/Button";

type FinishWorkoutBarProps = {
  canLogSets: boolean;
  isFinishing: boolean;
  totalSets: number;
  onFinish: () => void;
};

export function FinishWorkoutBar({
  canLogSets,
  isFinishing,
  totalSets,
  onFinish,
}: FinishWorkoutBarProps) {
  return (
    <>
      <Button
        fullWidth
        disabled={!canLogSets || isFinishing || totalSets === 0}
        onClick={onFinish}
      >
        {isFinishing ? "Finishing…" : "Finish Workout"}
      </Button>

      {canLogSets && totalSets === 0 ? (
        <p className="text-center text-xs text-zinc-500">
          Log at least one set before finishing.
        </p>
      ) : null}
    </>
  );
}
