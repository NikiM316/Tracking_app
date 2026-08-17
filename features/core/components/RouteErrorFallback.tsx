"use client";

import { useEffect } from "react";

import { Button } from "@/features/core/components/Button";

type RouteErrorFallbackProps = {
  error: Error & { digest?: string };
  onRetry?: () => void;
};

export function RouteErrorFallback({
  error,
  onRetry,
}: RouteErrorFallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  function handleRetry() {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
  }

  return (
    <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
        Error
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-50">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
        Please refresh. This is usually a brief connection issue.
      </p>
      <Button className="mt-6 min-w-36" onClick={handleRetry}>
        Retry
      </Button>
    </section>
  );
}
