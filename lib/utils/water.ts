export const WATER_GOAL_ML = 3500;

/** Quick-add presets shown on the water tracker (ml). */
export const QUICK_WATER_AMOUNTS_ML = [200, 750, 1000, 1500] as const;

/** Default custom-amount seed / server-action fallback. */
export const WATER_INCREMENT_ML = QUICK_WATER_AMOUNTS_ML[0];

export type WaterUnit = "ml" | "L";

/** Parses a free-form water amount. Supports "200", "1.5", "1,5 L", "750ml". */
export function parseWaterAmountToMl(
  raw: string,
  preferredUnit: WaterUnit = "ml",
): number | null {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)(ml|l)?$/);
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;

  const unitSuffix = match[2];
  const unit: WaterUnit =
    unitSuffix === "l" ? "L" : unitSuffix === "ml" ? "ml" : preferredUnit;

  const ml = unit === "L" ? value * 1000 : value;
  const rounded = Math.round(ml);
  if (rounded <= 0 || rounded > 20_000) return null;
  return rounded;
}

export function formatWaterMl(ml: number): string {
  if (ml >= 1000 && ml % 1000 === 0) return `${ml / 1000} L`;
  if (ml >= 1000) return `${(ml / 1000).toFixed(2)} L`;
  return `${ml} ml`;
}
