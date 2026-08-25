import { getHabitsPageData } from "@/features/monk/actions/habits";
import { HabitsManager } from "@/features/monk/components/habits/HabitsManager";

export const dynamic = "force-dynamic";

export default async function MonkHabitsPage() {
  const data = await getHabitsPageData();
  return <HabitsManager {...data} />;
}
