"use server";

import { getOrCreateTodayWorkout } from "@/features/fitness/lib/today-workout";
import { CYCLE_PROGRAM, getProgramDay } from "@/lib/program/cycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CycleExercise = {
  slug: string;
  name: string;
};

export type CycleDayOverview = {
  day: number;
  label: string;
  exercises: CycleExercise[];
};

export type CycleOverviewData = {
  currentCycleDay: number;
  days: CycleDayOverview[];
};

function formatSlugAsName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function getCycleOverviewData(): Promise<CycleOverviewData> {
  const supabase = createServerSupabaseClient();
  const allSlugs = [
    ...new Set(CYCLE_PROGRAM.flatMap((day) => [...day.exerciseSlugs])),
  ];

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("slug, name")
    .in("slug", allSlugs);

  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  const nameBySlug = new Map(
    (exercises ?? []).map((exercise) => [exercise.slug, exercise.name]),
  );

  const days = Array.from({ length: 14 }, (_, index) => {
    const day = index + 1;
    const programDay = getProgramDay(day);

    if (!programDay) {
      return {
        day,
        label: "Unprogrammed",
        exercises: [],
      };
    }

    return {
      day,
      label: programDay.label,
      exercises: programDay.exerciseSlugs.map((slug) => ({
        slug,
        name: nameBySlug.get(slug) ?? formatSlugAsName(slug),
      })),
    };
  });

  const todaysWorkout = await getOrCreateTodayWorkout();

  return {
    currentCycleDay: todaysWorkout.cycle_day,
    days,
  };
}
