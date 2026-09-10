import { getProgramDay } from "@/lib/program/cycle";
import { nextCycleDay } from "@/lib/utils/cycle-day";
import { eachDateInclusive } from "@/lib/utils/dates";

const REST_CYCLE_DAYS = new Set([4, 7, 11, 14]);

export type ConsistencyDayStatus =
  | "logged"
  | "pending"
  | "rest"
  | "missed"
  | "future";

export type ConsistencyDay = {
  date: string;
  cycleDay: number | null;
  programLabel: string | null;
  status: ConsistencyDayStatus;
};

export type CalendarWorkout = {
  date: string;
  cycle_day: number;
  completed_at: string | null;
};

function dayFromCycle(date: string, cycleDay: number, status: ConsistencyDayStatus): ConsistencyDay {
  return {
    date,
    cycleDay,
    programLabel: getProgramDay(cycleDay)?.label ?? null,
    status,
  };
}

function statusForWorkout(
  date: string,
  today: string,
  workout: CalendarWorkout,
): ConsistencyDayStatus {
  if (workout.completed_at != null) {
    return "logged";
  }
  if (REST_CYCLE_DAYS.has(workout.cycle_day)) {
    return "rest";
  }
  if (date === today) {
    return "pending";
  }
  return "missed";
}

/**
 * Builds the consistency grid from logged workouts only.
 * Gap days (never opened /today) are missed and have no inferred program day,
 * matching /today: skipping a calendar day does not skip a cycle day.
 */
export function buildConsistencyDays(
  today: string,
  workouts: CalendarWorkout[],
): ConsistencyDay[] {
  const workoutByDate = new Map<string, CalendarWorkout>();
  for (const workout of workouts) {
    workoutByDate.set(workout.date, workout);
  }

  const start = workouts.reduce(
    (earliest, workout) => (workout.date < earliest ? workout.date : earliest),
    today,
  );

  let lastCycleDay: number | null = null;
  const days: ConsistencyDay[] = [];

  for (const date of eachDateInclusive(start, today)) {
    const workout = workoutByDate.get(date);
    if (workout) {
      lastCycleDay = workout.cycle_day;
      days.push(dayFromCycle(date, workout.cycle_day, statusForWorkout(date, today, workout)));
      continue;
    }

    if (date === today) {
      const cycleDay = nextCycleDay(lastCycleDay);
      const status = REST_CYCLE_DAYS.has(cycleDay) ? "rest" : "pending";
      days.push(dayFromCycle(date, cycleDay, status));
      continue;
    }

    days.push({
      date,
      cycleDay: null,
      programLabel: null,
      status: "missed",
    });
  }

  return days;
}
