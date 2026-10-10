import { major, monthLabel, niceTicks, readInsights } from "./insights";

describe("insight helpers", () => {
  it("rounds an axis up to a clean top with clean ticks", () => {
    expect(niceTicks(2350)).toEqual({ top: 3000, ticks: [0, 1000, 2000, 3000] });
    expect(niceTicks(9)).toEqual({ top: 10, ticks: [0, 5, 10] });
    expect(niceTicks(0)).toEqual({ top: 1, ticks: [0, 1] });
    expect(niceTicks(1_234_567).top).toBe(1_500_000);
  });

  it("names months briefly, in English, without shifting across time zones", () => {
    expect(monthLabel("2026-01")).toBe("Jan");
    expect(monthLabel("2026-12", true)).toBe("Dec 2026");
  });

  it("draws in major units", () => {
    expect(major("250050")).toBe(2500.5);
  });

  it("keeps only rows that look right", () => {
    const good = {
      month: "2026-09",
      currency: "NGN",
      moneyIn: "1",
      moneyOut: "2",
      savedNet: "-3",
      endAvailable: "4",
      endSavings: "5",
      endLocked: "0",
    };
    expect(
      readInsights({ months: [good, { ...good, month: "Sept" }, { ...good, moneyIn: 5 }] }),
    ).toEqual([good]);
    expect(readInsights({})).toBeNull();
  });
});
