import { describe, expect, it } from "vitest";
import { addDays, addInterval, addMonths, compareDates, parseDate } from "./calendar";

describe("parseDate", () => {
  it("accepts ISO calendar dates", () => {
    expect(parseDate("2026-10-01")).toBe("2026-10-01");
  });

  it("rejects malformed or impossible dates", () => {
    for (const input of ["2026-1-01", "01/10/2026", "2026-02-30", "2026-13-01", ""]) {
      expect(() => parseDate(input), input).toThrow(/date/i);
    }
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("is not affected by daylight saving changes", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
  });
});

describe("addMonths", () => {
  it("keeps the day of month", () => {
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
  });

  it("clamps to the last day of shorter months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("crosses years", () => {
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
  });
});

describe("addInterval", () => {
  it("steps by daily, weekly or monthly frequency", () => {
    expect(addInterval("2026-10-01", "daily", 2)).toBe("2026-10-03");
    expect(addInterval("2026-10-01", "weekly", 2)).toBe("2026-10-15");
    expect(addInterval("2026-10-31", "monthly", 1)).toBe("2026-11-30");
  });
});

describe("compareDates", () => {
  it("orders dates", () => {
    expect(compareDates("2026-01-01", "2026-01-02")).toBeLessThan(0);
    expect(compareDates("2026-01-02", "2026-01-01")).toBeGreaterThan(0);
    expect(compareDates("2026-01-01", "2026-01-01")).toBe(0);
  });
});
