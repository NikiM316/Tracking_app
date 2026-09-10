export const CYCLE_LENGTH = 14;

/** Next program day after a logged workout. Skipping a calendar day does not skip a cycle day. */
export function nextCycleDay(previousCycleDay: number | null | undefined): number {
  if (previousCycleDay == null) {
    return 1;
  }

  return (previousCycleDay % CYCLE_LENGTH) + 1;
}
