"use client";

import { RouteErrorFallback } from "@/features/core/components/RouteErrorFallback";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function AppError({
  error,
  reset,
  unstable_retry,
}: AppErrorProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <RouteErrorFallback error={error} onRetry={unstable_retry ?? reset} />
    </div>
  );
}
