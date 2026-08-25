import { getTodayPageData } from "@/features/monk/actions/today";
import { TodayView } from "@/features/monk/components/today/TodayView";

export const dynamic = "force-dynamic";

export default async function MonkTodayPage() {
  const data = await getTodayPageData();
  return <TodayView {...data} />;
}
