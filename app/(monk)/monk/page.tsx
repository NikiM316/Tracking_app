import { Suspense } from "react";

import { getTodayPageData } from "@/features/monk/actions/today";
import { TodayPageSkeleton } from "@/features/monk/components/layout/TodayPageSkeleton";
import { TodayView } from "@/features/monk/components/today/TodayView";

export const dynamic = "force-dynamic";

async function MonkToday() {
  const data = await getTodayPageData();
  return <TodayView {...data} />;
}

export default function MonkTodayPage() {
  return (
    <Suspense fallback={<TodayPageSkeleton />}>
      <MonkToday />
    </Suspense>
  );
}
