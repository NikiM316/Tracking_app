import { Skeleton } from "@/features/core/components/Skeleton";

function ChecklistRowSkeleton() {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3">
      <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function TodayPageSkeleton() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading today&apos;s checklist</span>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-12 w-56" />
        <Skeleton className="mt-3 h-4 w-32" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-12" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="mt-3 space-y-2">
          <ChecklistRowSkeleton />
          <ChecklistRowSkeleton />
          <ChecklistRowSkeleton />
          <ChecklistRowSkeleton />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <Skeleton className="h-4 w-28" />
        <div className="mt-3 space-y-2">
          <ChecklistRowSkeleton />
          <ChecklistRowSkeleton />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </section>
    </div>
  );
}
