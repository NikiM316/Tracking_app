import { ResetScreen } from "./ResetScreen";
import { SetupForm } from "./SetupForm";
import { TodayChecklist } from "./TodayChecklist";
import type { TodayPageData } from "@/features/monk/types";

export function TodayView(data: TodayPageData) {
  if (data.mode === "setup") {
    return (
      <SetupForm
        defaultLimit={data.settings.social_media_limit_minutes}
        existingHabitCount={data.habits.filter((habit) => habit.is_active).length}
      />
    );
  }

  if (data.mode === "reset_required" || data.mode === "completed") {
    return (
      <ResetScreen
        summary={data.lastChallenge}
        defaultLimit={data.settings.social_media_limit_minutes}
        variant={data.mode === "completed" ? "completed" : "failed"}
      />
    );
  }

  return <TodayChecklist {...data} />;
}
