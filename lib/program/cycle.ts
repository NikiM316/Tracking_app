export type ProgramDay = {
  day: number;
  label: string;
  exerciseSlugs: readonly string[];
};

export const CYCLE_PROGRAM = [
  { day: 1, label: "Push A", exerciseSlugs: ["wall-hspu-negatives", "incline-dumbbell-press", "weighted-dips", "machine-flys", "lu-raises", "overhead-cable-triceps-extension", "hanging-leg-raises", "high-to-low-cable-woodchoppers"] },
  { day: 2, label: "Pull A", exerciseSlugs: ["muscle-up", "weighted-pull-ups", "chest-supported-row", "face-pulls", "incline-biceps-curls", "l-sit-hold", "kneeling-ab-wheel-rollouts"] },
  { day: 3, label: "Legs A", exerciseSlugs: ["barbell-back-squat", "romanian-deadlift", "atg-split-squats", "standing-calf-raises", "weighted-decline-sit-ups", "weighted-copenhagen-planks"] },
  { day: 4, label: "Active Recovery", exerciseSlugs: ["zone-2-cardio", "jefferson-curls", "couch-stretch", "vacuum-holds"] },
  { day: 5, label: "Upper A", exerciseSlugs: ["overhead-press", "weighted-chin-ups", "bench-press", "seated-cable-row", "hammer-curls", "rope-tricep-pushdowns", "heavy-kneeling-cable-crunches", "weighted-russian-twists"] },
  { day: 6, label: "Lower A", exerciseSlugs: ["conventional-deadlift", "bulgarian-split-squats", "leg-curls", "leg-extension", "seated-calf-raises", "garhammer-raises", "weighted-side-plank"] },
  { day: 7, label: "Total Rest", exerciseSlugs: [] },
  { day: 8, label: "Push B", exerciseSlugs: ["handstand-push-up", "archer-push-ups", "standing-landmine-press", "flat-db-bench-press", "lateral-raises", "incline-skull-crushers", "hanging-leg-raises", "standing-pallof-press"] },
  { day: 9, label: "Pull B", exerciseSlugs: ["muscle-up", "neutral-grip-pull-ups", "pendlay-barbell-rows", "straight-arm-lat-pulldown", "rear-delt-cable-flys", "incline-dumbbell-curls", "l-sit-hold", "heavy-kneeling-cable-crunches", "back-extension"] },
  { day: 10, label: "Legs B", exerciseSlugs: ["front-squat", "single-leg-rdl-dumbbell", "weighted-walking-lunges", "seated-leg-curl", "standing-calf-raises", "weighted-decline-sit-ups", "weighted-copenhagen-planks"] },
  { day: 11, label: "Active Recovery", exerciseSlugs: ["zone-2-cardio", "deep-squat-hold", "thoracic-bridge"] },
  { day: 12, label: "Upper B", exerciseSlugs: ["strict-hollow-body-pull-ups", "parallel-bar-dips", "heavy-db-row", "pseudo-push-ups", "high-cable-triceps-extensions", "zottman-curls", "hollow-body-hold", "weighted-russian-twists"] },
  { day: 13, label: "Lower B", exerciseSlugs: ["db-goblet-squat", "nordic-hamstring-curls", "weighted-cossack-squats", "seated-calf-raises", "bench-reverse-crunches", "weighted-side-plank"] },
  { day: 14, label: "Total Rest", exerciseSlugs: [] }
] as const;

export function getProgramDay(cycleDay: number): ProgramDay | undefined {
  return CYCLE_PROGRAM.find((day) => day.day === cycleDay);
}
