import { Skeleton } from "@/features/core/components/Skeleton";

function AccountRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Loading finance dashboard</span>

      <section className="rounded-2xl border border-emerald-500/30 bg-zinc-900/60 p-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-2 h-9 w-44" />
        <Skeleton className="mt-2 h-4 w-56" />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="mt-3 h-8 w-40" />
        <div className="mt-4 space-y-3">
          <AccountRowSkeleton />
          <AccountRowSkeleton />
          <AccountRowSkeleton />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-full" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="mt-3 h-3 w-28" />
        <Skeleton className="mt-1 h-8 w-36" />
        <div className="mt-4 space-y-3">
          <AccountRowSkeleton />
          <AccountRowSkeleton />
        </div>
      </section>
    </div>
  );
}
