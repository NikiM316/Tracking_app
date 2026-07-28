export type ProgramDay = {
  day: number;
  label: string;
  exerciseSlugs: readonly string[];
};

export const CYCLE_PROGRAM: ProgramDay[] = [
  {
    day: 1,
    label: "Lower + Calisthenics",
    exerciseSlugs: ["barbell-back-squat", "muscle-up"],
  },
  {
    day: 2,
    label: "Upper Pressing",
    exerciseSlugs: ["overhead-press", "handstand-push-up"],
  },
  // Days 3–14 will be added later
];

export function getProgramDay(cycleDay: number): ProgramDay | undefined {
  return CYCLE_PROGRAM.find((day) => day.day === cycleDay);
}
