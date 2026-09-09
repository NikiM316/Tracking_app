import type { ActionResult, MonkHabitLogView, TodayPageData } from "@/features/monk/types";
import type { MonkTask, StudyPlanItem } from "@/lib/supabase/monk-types";

export type ChecklistProps = Extract<TodayPageData, { mode: "today" }>;

export type MinutesChannel = {
  actualMinutes: number | null;
  limitMinutes: number;
};

export type MinutesDraft = {
  dayId: string;
  actualMinutes: number | null;
  limitMinutes: number;
};

export function resolveMinutesDraft(
  dayId: string,
  stored: MinutesChannel,
  draft: MinutesDraft | null,
): MinutesChannel {
  if (draft?.dayId === dayId) {
    return {
      actualMinutes: draft.actualMinutes,
      limitMinutes: draft.limitMinutes,
    };
  }
  return stored;
}

export type ChecklistOptimistic = {
  habits: MonkHabitLogView[];
  tasks: MonkTask[];
  studyItems: StudyPlanItem[];
};

export type ChecklistOptimisticAction =
  | { type: "toggleHabit"; id: string }
  | { type: "toggleTask"; id: string }
  | { type: "deleteTask"; id: string }
  | { type: "toggleStudyItem"; id: string };

export type ChecklistAct = (
  fn: () => Promise<ActionResult>,
  optimisticAction?: ChecklistOptimisticAction,
) => void;

export function applyChecklistOptimistic(
  current: ChecklistOptimistic,
  action: ChecklistOptimisticAction,
): ChecklistOptimistic {
  switch (action.type) {
    case "toggleHabit":
      return {
        ...current,
        habits: current.habits.map((habit) =>
          habit.id === action.id
            ? { ...habit, is_completed: !habit.is_completed }
            : habit,
        ),
      };
    case "toggleTask":
      return {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === action.id
            ? { ...task, is_completed: !task.is_completed }
            : task,
        ),
      };
    case "deleteTask":
      return {
        ...current,
        tasks: current.tasks.filter((task) => task.id !== action.id),
      };
    case "toggleStudyItem":
      return {
        ...current,
        studyItems: current.studyItems.map((item) =>
          item.id === action.id
            ? { ...item, is_completed: !item.is_completed }
            : item,
        ),
      };
  }
}

export function runResult(
  result: ActionResult,
  setError: (value: string | null) => void,
) {
  if ("error" in result) {
    setError(result.error);
    return;
  }
  setError(null);
}

export type ReflectionDraft = {
  accomplished: string;
  failedToDo: string;
  whyFailed: string;
  improveTomorrow: string;
};
