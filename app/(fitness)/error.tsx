"use client";

import { RouteErrorFallback } from "@/features/core/components/RouteErrorFallback";

type FitnessErrorProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
};

export default function FitnessError({
  error,
  reset,
  unstable_retry,
}: FitnessErrorProps) {
  return (
    <RouteErrorFallback error={error} onRetry={unstable_retry ?? reset} />
  );
}
