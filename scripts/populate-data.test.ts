import { describe, it, expect, vi } from "vitest";
import {
  parseCommissioningDate,
  isDateInRange,
  parsePowerRange,
  isPowerInRange,
  extractMonthFromBezeichnung,
  reconcileDateRangeWithBezeichnung,
} from "./populate-data";

describe("parseCommissioningDate", () => {
  it('should parse "bis" date ranges', () => {
    const result = parseCommissioningDate("Inbetriebnahme bis 2001");
    expect(result).toEqual({
      from: "1900-01-01",
      to: "2001-12-31",
    });
  });

  it("should parse single year dates", () => {
    const result = parseCommissioningDate("Inbetriebnahme 2005");
    expect(result).toEqual({
      from: "2005-01-01",
      to: "2005-12-31",
    });
  });

  it("should parse month range dates", () => {
    const result = parseCommissioningDate("Inbetriebnahme 01-07/2004");
    expect(result).toEqual({
      from: "2004-01-01",
      to: "2004-07-31",
    });
  });

  it('should parse "ab" dates with month/year', () => {
    const result = parseCommissioningDate("Inbetriebnahme ab 01/2017");
    expect(result).toEqual({
      from: "2017-01-01",
    });
  });

  it('should parse "ab" dates with specific date', () => {
    const result = parseCommissioningDate("Inbetriebnahme ab 25.07.2017");
    expect(result).toEqual({
      from: "2017-07-25",
    });
  });

  it("should parse single month dates", () => {
    const result = parseCommissioningDate("Inbetriebnahme 04/2020");
    expect(result).toEqual({
      from: "2020-04-01",
      to: "2020-04-30",
    });
  });

  it("should parse modernization years", () => {
    const result = parseCommissioningDate("Modernisierung 2020");
    expect(result).toEqual({
      from: "2020-01-01",
      to: "2020-12-31",
    });
  });

  it("should parse modernization date ranges", () => {
    const result = parseCommissioningDate("Modernisierung 01-07/2014");
    expect(result).toEqual({
      from: "2014-01-01",
      to: "2014-07-31",
    });
  });

  it("should parse specific date ranges within same year", () => {
    const result = parseCommissioningDate("Inbetriebnahme 30.07. bis 31.12.2022");
    expect(result).toEqual({
      from: "2022-07-30",
      to: "2022-12-31",
    });
  });

  it("should parse date ranges with dash separator", () => {
    const result = parseCommissioningDate("Inbetriebnahme 01.01. - 15.05.2024");
    expect(result).toEqual({
      from: "2024-01-01",
      to: "2024-05-15",
    });
  });

  it("should parse cross-year date ranges", () => {
    const result = parseCommissioningDate("Inbetriebnahme 25.07.2017 - 31.12.2020");
    expect(result).toEqual({
      from: "2017-07-25",
      to: "2020-12-31",
    });
  });

  it("should handle unparseable dates", () => {
    const result = parseCommissioningDate("Some random text");
    expect(result).toBeNull();
  });
});

describe("extractMonthFromBezeichnung", () => {
  it("extracts month and year from a half-year suffix", () => {
    expect(extractMonthFromBezeichnung("SgK4820--Feb26")).toEqual({ month: 2, year: 2026 });
    expect(extractMonthFromBezeichnung("SgK482a0-Aug26")).toEqual({ month: 8, year: 2026 });
    expect(extractMonthFromBezeichnung("SoK481---Feb26")).toEqual({ month: 2, year: 2026 });
  });

  it("extracts month and year from pre-2024 single-month suffixes", () => {
    expect(extractMonthFromBezeichnung("SgK4820--Jul17")).toEqual({ month: 7, year: 2017 });
    expect(extractMonthFromBezeichnung("SgK4820--Mrz19")).toEqual({ month: 3, year: 2019 });
    expect(extractMonthFromBezeichnung("SgK4820--Dez20")).toEqual({ month: 12, year: 2020 });
  });

  it("returns null for bezeichnungs without a month suffix", () => {
    expect(extractMonthFromBezeichnung("SgK4820-----23")).toBeNull();
    expect(extractMonthFromBezeichnung("WaK41a------01")).toBeNull();
    expect(extractMonthFromBezeichnung("")).toBeNull();
  });
});

describe("reconcileDateRangeWithBezeichnung", () => {
  it("returns the parsed range unchanged when bezeichnung has no month suffix", () => {
    const parsed = { from: "2023-01-01", to: "2023-12-31" };
    expect(reconcileDateRangeWithBezeichnung("SgK4820-----23", parsed)).toEqual(parsed);
  });

  it("returns the parsed range unchanged when suffix and parsed start-month agree (half-year)", () => {
    const parsed = { from: "2026-02-01", to: "2026-07-31" };
    expect(reconcileDateRangeWithBezeichnung("SgK4820--Feb26", parsed)).toEqual(parsed);
  });

  it("returns the parsed range unchanged when suffix and parsed start-month agree (pre-2024 single month)", () => {
    const parsed = { from: "2019-02-01", to: "2019-02-28" };
    expect(reconcileDateRangeWithBezeichnung("SgK4820--Feb19", parsed)).toEqual(parsed);
  });

  it("corrects an Aug26 row whose Inbetriebnahme cell has the H1 window (the netztransparenz bug)", () => {
    // Bug observed in eeg-verguetungskategorien_eeg_2026_20260316.xlsx rows 4301-4303:
    // the bezeichnung says --Aug26 but the Inbetriebnahme cell says "02-07/2026".
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = { from: "2026-02-01", to: "2026-07-31" };
    const result = reconcileDateRangeWithBezeichnung("SgK4820--Aug26", parsed);
    expect(result).toEqual({ from: "2026-08-01", to: "2026-12-31" });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("corrects a Feb26 row whose Inbetriebnahme cell has the H2 window", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = { from: "2026-08-01", to: "2026-12-31" };
    const result = reconcileDateRangeWithBezeichnung("SgK4820--Feb26", parsed);
    expect(result).toEqual({ from: "2026-02-01", to: "2026-07-31" });
    warn.mockRestore();
  });

  it("corrects a pre-2024 single-month suffix to a single month window on mismatch", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = { from: "2019-05-01", to: "2019-05-31" };
    const result = reconcileDateRangeWithBezeichnung("SgK4820--Feb19", parsed);
    expect(result).toEqual({ from: "2019-02-01", to: "2019-02-28" });
    warn.mockRestore();
  });

  it("handles February in a leap year correctly when correcting a pre-2024 single-month suffix", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = { from: "2020-05-01", to: "2020-05-31" };
    const result = reconcileDateRangeWithBezeichnung("SgK4820--Feb20", parsed);
    expect(result).toEqual({ from: "2020-02-01", to: "2020-02-29" });
    warn.mockRestore();
  });

  it("returns null when the parsed range is null even if bezeichnung has a suffix", () => {
    expect(reconcileDateRangeWithBezeichnung("SgK4820--Feb26", null)).toBeNull();
  });
});

describe("isDateInRange", () => {
  it("should return true for dates within range", () => {
    const range = { from: "2005-01-01", to: "2005-12-31" };
    expect(isDateInRange("2005-06-15", range)).toBe(true);
  });

  it("should return false for dates before range", () => {
    const range = { from: "2005-01-01", to: "2005-12-31" };
    expect(isDateInRange("2004-12-31", range)).toBe(false);
  });

  it("should return false for dates after range", () => {
    const range = { from: "2005-01-01", to: "2005-12-31" };
    expect(isDateInRange("2006-01-01", range)).toBe(false);
  });

  it("should return true for open-ended ranges", () => {
    const range = { from: "2017-07-25" }; // no 'to' date
    expect(isDateInRange("2023-01-01", range)).toBe(true);
  });

  it("should return false for dates before open-ended range start", () => {
    const range = { from: "2017-07-25" };
    expect(isDateInRange("2017-07-24", range)).toBe(false);
  });
});

describe("parsePowerRange", () => {
  it("should parse MW ranges", () => {
    const result = parsePowerRange("0-0,5 MW");
    expect(result).toEqual({
      from: 0,
      to: 500,
    });
  });

  it("should parse MW ranges with spaces", () => {
    const result = parsePowerRange("1 - 10 MW");
    expect(result).toEqual({
      from: 1000,
      to: 10000,
    });
  });

  it("should parse mixed unit ranges", () => {
    const result = parsePowerRange("40 kW - 1 MW");
    expect(result).toEqual({
      from: 40,
      to: 1000,
    });
  });

  it("should parse kW ranges with spaces", () => {
    const result = parsePowerRange("10 - 40 kW");
    expect(result).toEqual({
      from: 10,
      to: 40,
    });
  });

  it("should parse kW ranges without spaces", () => {
    const result = parsePowerRange("0-30 kW");
    expect(result).toEqual({
      from: 0,
      to: 30,
    });
  });

  it("should parse greater than MW", () => {
    const result = parsePowerRange("> 1 MW");
    expect(result).toEqual({
      from: 1000,
    });
  });

  it("should parse greater than kW", () => {
    const result = parsePowerRange("> 100 kW");
    expect(result).toEqual({
      from: 100,
    });
  });

  it("should parse less than or equal kW", () => {
    const result = parsePowerRange("≤ 100 kW");
    expect(result).toEqual({
      from: 0,
      to: 100,
    });
  });

  it("should handle unparseable power criteria", () => {
    const result = parsePowerRange("Some other criteria");
    expect(result).toBeNull();
  });
});

describe("isPowerInRange", () => {
  it("should return true for power within range", () => {
    const range = { from: 10, to: 40 };
    expect(isPowerInRange(25, range)).toBe(true);
  });

  it("should return false for power below range", () => {
    const range = { from: 10, to: 40 };
    expect(isPowerInRange(5, range)).toBe(false);
  });

  it("should return false for power above range", () => {
    const range = { from: 10, to: 40 };
    expect(isPowerInRange(50, range)).toBe(false);
  });

  it("should return true for power in open-ended range", () => {
    const range = { from: 100 }; // no upper limit
    expect(isPowerInRange(500, range)).toBe(true);
  });

  it("should return false for power below open-ended range start", () => {
    const range = { from: 100 };
    expect(isPowerInRange(50, range)).toBe(false);
  });
});

describe("real world scenarios", () => {
  it("should correctly identify solar plants from 2005", () => {
    const range = parseCommissioningDate("Inbetriebnahme 2005");
    expect(isDateInRange("2005-06-15", range!)).toBe(true);
    expect(isDateInRange("2004-12-31", range!)).toBe(false);
    expect(isDateInRange("2006-01-01", range!)).toBe(false);
  });

  it("should correctly handle partial year ranges", () => {
    const range = parseCommissioningDate("Inbetriebnahme 01-07/2004");
    expect(isDateInRange("2004-05-15", range!)).toBe(true);
    expect(isDateInRange("2004-08-01", range!)).toBe(false);
    expect(isDateInRange("2003-12-31", range!)).toBe(false);
  });

  it("should handle modern installations after specific date", () => {
    const range = parseCommissioningDate("Inbetriebnahme ab 25.07.2017");
    expect(isDateInRange("2017-07-25", range!)).toBe(true);
    expect(isDateInRange("2017-07-24", range!)).toBe(false);
    expect(isDateInRange("2025-01-01", range!)).toBe(true);
  });

  it("should correctly identify power ranges for solar installations", () => {
    const range = parsePowerRange("10 - 40 kW");
    expect(isPowerInRange(25, range!)).toBe(true);
    expect(isPowerInRange(5, range!)).toBe(false);
    expect(isPowerInRange(50, range!)).toBe(false);
  });

  it("should handle large installations in MW", () => {
    const range = parsePowerRange("0,5-5 MW");
    expect(isPowerInRange(2000, range!)).toBe(true); // 2 MW = 2000 kW
    expect(isPowerInRange(400, range!)).toBe(false); // Below 0.5 MW
    expect(isPowerInRange(6000, range!)).toBe(false); // Above 5 MW
  });
});
