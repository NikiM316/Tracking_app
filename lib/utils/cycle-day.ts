const CYCLE_LENGTH = 14;

export function getCycleDay(
  anchorDate: string,
  today: Date = new Date(),
): number {
  const start = new Date(anchorDate);
  start.setHours(0, 0, 0, 0);

  const current = new Date(today);
  current.setHours(0, 0, 0, 0);

  const diffMs = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const normalized = ((diffDays % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;

  return normalized + 1;
}

export function getCycleAnchorDate(): string {
  return process.env.CYCLE_START_DATE ?? "2026-01-01";
}
