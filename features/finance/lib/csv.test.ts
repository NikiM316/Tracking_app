import { describe, expect, it } from "vitest";

import { parseAmountCell, parseCsvRows, parseDateCell } from "./csv";

describe("parseDateCell", () => {
  it("passes through an ISO date", () => {
    expect(parseDateCell("2026-09-02")).toBe("2026-09-02");
  });

  it("truncates an ISO timestamp to the date", () => {
    expect(parseDateCell("2026-09-02T14:30:00Z")).toBe("2026-09-02");
    expect(parseDateCell("2026-09-02 14:30:00")).toBe("2026-09-02");
  });

  it("reads DD/MM/YYYY as day-first, not month-first", () => {
    // Revolut exports are European; reading this as February would silently
    // file the transaction in the wrong month.
    expect(parseDateCell("02/09/2026")).toBe("2026-09-02");
  });

  it("reads DD.MM.YYYY as day-first", () => {
    expect(parseDateCell("02.09.2026")).toBe("2026-09-02");
  });

  it("zero-pads single-digit days and months", () => {
    expect(parseDateCell("2/9/2026")).toBe("2026-09-02");
    expect(parseDateCell("2.9.2026")).toBe("2026-09-02");
  });

  it("keeps an unambiguous day-first date above 12 in the day slot", () => {
    expect(parseDateCell("25/12/2026")).toBe("2026-12-25");
  });

  it("parses spelled-out month names via the Date fallback", () => {
    expect(parseDateCell("Aug 1, 2026")).toBe("2026-08-01");
    expect(parseDateCell("1 August 2026")).toBe("2026-08-01");
  });

  it("does not shift the day when falling back to the Date parser", () => {
    // The fallback must read local y/m/d components rather than
    // toISOString(), which would move the date back a day west of UTC.
    expect(parseDateCell("Jan 1, 2026")).toBe("2026-01-01");
    expect(parseDateCell("Dec 31, 2026")).toBe("2026-12-31");
  });

  it("strips surrounding quotes", () => {
    expect(parseDateCell('"2026-09-02"')).toBe("2026-09-02");
  });

  it("trims surrounding whitespace", () => {
    expect(parseDateCell("  2026-09-02  ")).toBe("2026-09-02");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(parseDateCell("")).toBeNull();
    expect(parseDateCell("   ")).toBeNull();
    expect(parseDateCell('""')).toBeNull();
  });

  it("returns null for text that is not a date", () => {
    // Revolut statements are full of section headers and labels; these must
    // not be mistaken for transaction rows.
    expect(parseDateCell("Total")).toBeNull();
    expect(parseDateCell("Account Summary")).toBeNull();
    expect(parseDateCell("Money in/out")).toBeNull();
  });
});

describe("parseAmountCell", () => {
  it("parses a plain positive and negative amount", () => {
    expect(parseAmountCell("100.50")).toBe(100.5);
    expect(parseAmountCell("-100.50")).toBe(-100.5);
  });

  it("strips a leading or trailing currency symbol", () => {
    expect(parseAmountCell("€100.50")).toBe(100.5);
    expect(parseAmountCell("$100.50")).toBe(100.5);
    expect(parseAmountCell("100.50 EUR")).toBe(100.5);
  });

  it("keeps the sign on a negative amount with a currency symbol", () => {
    expect(parseAmountCell("-€100.50")).toBe(-100.5);
  });

  it("parses zero", () => {
    expect(parseAmountCell("0")).toBe(0);
    expect(parseAmountCell("0.00")).toBe(0);
  });

  it("trims whitespace", () => {
    expect(parseAmountCell("  42  ")).toBe(42);
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(parseAmountCell("")).toBeNull();
    expect(parseAmountCell("   ")).toBeNull();
  });

  it("returns null when there is no digit at all", () => {
    expect(parseAmountCell("N/A")).toBeNull();
    expect(parseAmountCell("-")).toBeNull();
    expect(parseAmountCell("€")).toBeNull();
  });

  it("returns null rather than NaN for unparseable digit soup", () => {
    // Stripping non-numerics can leave something like "1.2.3", which Number()
    // turns into NaN; that must surface as null, not a NaN amount.
    expect(parseAmountCell("1.2.3")).toBeNull();
  });
});

describe("parseCsvRows", () => {
  const header = ["Date", "Description", "Currency", "Money in/out"];

  it("extracts a valid transaction row", () => {
    expect(parseCsvRows([["2026-09-02", "Coffee", "EUR", "-3.50"]])).toEqual([
      { date: "2026-09-02", amount: -3.5, description: "Coffee" },
    ]);
  });

  it("drops the header row, since its date cell is not a date", () => {
    expect(parseCsvRows([header])).toEqual([]);
  });

  it("skips the summary preamble and keeps only real transactions", () => {
    const rows = [
      ["Account Statement"],
      [],
      ["Balance Summary", "", "", "1234.56"],
      header,
      ["2026-09-01", "Salary", "EUR", "2500.00"],
      ["2026-09-02", "Coffee", "EUR", "-3.50"],
      ["Total", "", "", "2496.50"],
    ];

    expect(parseCsvRows(rows)).toEqual([
      { date: "2026-09-01", amount: 2500, description: "Salary" },
      { date: "2026-09-02", amount: -3.5, description: "Coffee" },
    ]);
  });

  it("drops rows with fewer than four columns", () => {
    expect(parseCsvRows([["2026-09-02", "Coffee", "EUR"]])).toEqual([]);
  });

  it("drops zero-amount rows, which are balance lines rather than movements", () => {
    expect(parseCsvRows([["2026-09-02", "Nothing", "EUR", "0.00"]])).toEqual([]);
  });

  it("drops a row whose amount cell is not a number", () => {
    expect(parseCsvRows([["2026-09-02", "Pending", "EUR", "N/A"]])).toEqual([]);
  });

  it("trims the description and tolerates a missing one", () => {
    expect(parseCsvRows([["2026-09-02", "  Coffee  ", "EUR", "-3.50"]])).toEqual([
      { date: "2026-09-02", amount: -3.5, description: "Coffee" },
    ]);
    expect(parseCsvRows([["2026-09-02", "", "EUR", "-3.50"]])).toEqual([
      { date: "2026-09-02", amount: -3.5, description: "" },
    ]);
  });

  it("returns an empty list for no rows", () => {
    expect(parseCsvRows([])).toEqual([]);
  });

  it("handles a Revolut-style spelled-out date with a currency symbol", () => {
    expect(parseCsvRows([["Aug 1, 2026", "Rent", "EUR", "-€850.00"]])).toEqual([
      { date: "2026-08-01", amount: -850, description: "Rent" },
    ]);
  });
});
