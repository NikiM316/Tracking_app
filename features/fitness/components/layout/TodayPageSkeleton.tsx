import { Skeleton } from "@/features/core/components/Skeleton";

function ExerciseBlockSkeleton() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-20 w-full rounded-xl" />
    </section>
  );
}

export function TodayPageSkeleton() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading today&apos;s workout</span>

      <section className="rounded-2xl border border-sky-500/30 bg-zinc-900/60 p-5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-7 w-36" />
        <Skeleton className="mt-2 h-4 w-48" />
        <Skeleton className="mt-4 h-3 w-full rounded-full" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-10 w-16 rounded-xl" />
          <Skeleton className="h-10 w-16 rounded-xl" />
          <Skeleton className="h-10 w-16 rounded-xl" />
        </div>
        <Skeleton className="mt-3 h-11 w-full rounded-xl" />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-2 h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-40" />
      </section>

      <ExerciseBlockSkeleton />
      <ExerciseBlockSkeleton />

      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
