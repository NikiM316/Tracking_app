type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden className={`rounded-lg bg-zinc-800 ${className}`} />;
}
