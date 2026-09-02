import type { BulkImportTransactionRow } from "@/features/finance/types";

/**
 * Parses a date cell into a `YYYY-MM-DD` string, or null if it isn't a
 * recognizable date. Handles already-ISO values and `DD/MM/YYYY` /
 * `DD.MM.YYYY` first (unambiguous, string-based), then falls back to the
 * native Date parser for spelled-out formats like "Aug 1, 2026" (as used in
 * Revolut's Consolidated Statement export). The fallback reads the parsed
 * date's local y/m/d components directly rather than `toISOString()`, which
 * would shift the date by a day for anyone west of UTC at midnight.
 */
export function parseDateCell(raw: string): string | null {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dottedOrSlashMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dottedOrSlashMatch) {
    const [, day, month, year] = dottedOrSlashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "money in/out" cell into a signed float, stripping currency
 * symbols (e.g. "€", "$") and thousands separators first.
 */
export function parseAmountCell(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^\d.\-]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * Revolut's Consolidated Statement CSV export isn't a simple headered table:
 * it starts with 100+ lines of account summaries, balances, and portfolio
 * data before the actual transaction rows appear, and those transaction rows
 * aren't reliably distinguishable by a fixed line offset. Instead, each raw
 * row is treated as a transaction candidate only if column 0 parses as a
 * real date AND column 3 ("Money in/out") parses as a real number — which
 * filters out summary/section/blank rows without needing to know where the
 * transaction table starts.
 */
export function parseCsvRows(rows: string[][]): BulkImportTransactionRow[] {
  return rows
    .map((row) => {
      if (!row || row.length < 4) return null;

      const date = parseDateCell(row[0] ?? "");
      const amount = parseAmountCell(row[3] ?? "");

      if (!date || amount === null || amount === 0) {
        return null;
      }

      return { date, amount, description: (row[1] ?? "").trim() };
    })
    .filter((row): row is BulkImportTransactionRow => row !== null);
}
