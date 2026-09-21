import { getChallengePageData } from "@/features/monk/queries/challenge";
import { ChallengeView } from "@/features/monk/components/challenge/ChallengeView";

export const dynamic = "force-dynamic";

export default async function MonkChallengePage() {
  const data = await getChallengePageData();
  return <ChallengeView {...data} />;
}
