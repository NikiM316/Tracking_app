"use client";

import { RouteErrorFallback } from "@/features/core/components/RouteErrorFallback";

type MonkErrorProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function MonkError({
  error,
  reset,
  unstable_retry,
}: MonkErrorProps) {
  return (
    <RouteErrorFallback error={error} onRetry={unstable_retry ?? reset} />
  );
}
