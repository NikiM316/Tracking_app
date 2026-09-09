import { ExerciseBlock } from "@/features/fitness/components/workout/ExerciseBlock";
import type { LocalSet } from "@/features/fitness/components/workout/SetRow";
import type { TodayWorkoutData } from "@/features/fitness/actions/workout";

type ActiveWorkoutViewProps = {
  initialData: TodayWorkoutData;
  setsByExercise: Record<string, LocalSet[]>;
  notesByExercise: Record<string, string>;
  noteSavingByExercise: Record<string, boolean>;
  noteJustSavedByExercise: Record<string, boolean>;
  totalSets: number;
  disabled: boolean;
  onChangeSet: (exerciseId: string, localId: string, next: LocalSet) => void;
  onDeleteSet: (exerciseId: string, localId: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRestElapsedChange: (precedingSetLocalId: string, seconds: number) => void;
  onNoteChange: (exerciseId: string, note: string) => void;
};

export function ActiveWorkoutView({
  initialData,
  setsByExercise,
  notesByExercise,
  noteSavingByExercise,
  noteJustSavedByExercise,
  totalSets,
  disabled,
  onChangeSet,
  onDeleteSet,
  onAddSet,
  onRestElapsedChange,
  onNoteChange,
}: ActiveWorkoutViewProps) {
  return (
    <>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Today&apos;s session
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-50">
          {initialData.programLabel ?? "Workout"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {initialData.exercises.length} exercises · {totalSets} sets logged
        </p>
      </section>

      {initialData.exercises.map((exercise) => (
        <ExerciseBlock
          key={exercise.id}
          exercise={exercise}
          sets={setsByExercise[exercise.id] ?? []}
          disabled={disabled}
          previousSession={
            initialData.previousSessionsByExercise[exercise.id] ?? null
          }
          onChangeSet={(localId, next) => onChangeSet(exercise.id, localId, next)}
          onDeleteSet={(localId) => onDeleteSet(exercise.id, localId)}
          onAddSet={() => onAddSet(exercise.id)}
          onRestElapsedChange={onRestElapsedChange}
          previousNote={initialData.previousNotesByExercise[exercise.id] ?? null}
          noteValue={notesByExercise[exercise.id] ?? ""}
          onNoteChange={(value) => onNoteChange(exercise.id, value)}
          noteSaving={Boolean(noteSavingByExercise[exercise.id])}
          noteJustSaved={Boolean(noteJustSavedByExercise[exercise.id])}
        />
      ))}
    </>
  );
}
