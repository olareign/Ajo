import { describe, expect, it } from "vitest";
import { money } from "./money";
import { nextDebitDate, planSchedule, savedPercent } from "./solo";

const fiveThousandNaira = money(500_000, "NGN");

describe("planSchedule", () => {
  it("summarises a weekly plan for a year, as on the 'Your selections' screen", () => {
    const plan = planSchedule({
      amount: fiveThousandNaira,
      frequency: "weekly",
      duration: { unit: "months", count: 12 },
      startDate: "2026-10-05",
    });

    expect(plan.maturityDate).toBe("2027-10-05");
    expect(plan.depositCount).toBe(53);
    expect(plan.debitDates[0]).toBe("2026-10-05");
    expect(plan.debitDates.at(-1)).toBe("2027-10-04");
    expect(plan.total).toEqual(money(500_000 * 53, "NGN"));
  });

  it("debits monthly on the same day, clamped at month end", () => {
    const plan = planSchedule({
      amount: money(10_000, "GBP"),
      frequency: "monthly",
      duration: { unit: "months", count: 3 },
      startDate: "2026-01-31",
    });

    expect(plan.debitDates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(plan.maturityDate).toBe("2026-04-30");
    expect(plan.total).toEqual(money(30_000, "GBP"));
  });

  it("supports durations in weeks and days, e.g. a 6-week pilot plan", () => {
    const weeks = planSchedule({
      amount: money(1_000, "USD"),
      frequency: "daily",
      duration: { unit: "weeks", count: 6 },
      startDate: "2026-10-01",
    });
    expect(weeks.depositCount).toBe(42);
    expect(weeks.maturityDate).toBe("2026-11-12");

    const days = planSchedule({
      amount: money(1_000, "USD"),
      frequency: "weekly",
      duration: { unit: "days", count: 10 },
      startDate: "2026-10-01",
    });
    expect(days.debitDates).toEqual(["2026-10-01", "2026-10-08"]);
  });

  it("does not earn interest: the estimate is exactly what the user puts in", () => {
    const plan = planSchedule({
      amount: money(100, "GBP"),
      frequency: "monthly",
      duration: { unit: "months", count: 6 },
      startDate: "2026-10-01",
    });
    expect(plan.total.amount).toBe(600);
  });

  it("rejects a non-positive amount or duration", () => {
    const base = {
      frequency: "weekly" as const,
      startDate: "2026-10-01",
    };
    expect(() =>
      planSchedule({ ...base, amount: money(0, "NGN"), duration: { unit: "months", count: 1 } }),
    ).toThrow(/amount/i);
    expect(() =>
      planSchedule({ ...base, amount: fiveThousandNaira, duration: { unit: "months", count: 0 } }),
    ).toThrow(/duration/i);
    expect(() =>
      planSchedule({ ...base, amount: fiveThousandNaira, duration: { unit: "weeks", count: 1.5 } }),
    ).toThrow(/duration/i);
  });
});

describe("nextDebitDate", () => {
  const plan = planSchedule({
    amount: fiveThousandNaira,
    frequency: "weekly",
    duration: { unit: "weeks", count: 3 },
    startDate: "2026-10-05",
  });

  it("is the first debit on or after today", () => {
    expect(nextDebitDate(plan, "2026-10-01")).toBe("2026-10-05");
    expect(nextDebitDate(plan, "2026-10-05")).toBe("2026-10-05");
    expect(nextDebitDate(plan, "2026-10-06")).toBe("2026-10-12");
  });

  it("is null once the last debit has passed", () => {
    expect(nextDebitDate(plan, "2026-10-20")).toBeNull();
  });
});

describe("savedPercent", () => {
  it("rounds down to a whole percent for the progress bar", () => {
    expect(savedPercent(money(1, "NGN"), money(3, "NGN"))).toBe(33);
    expect(savedPercent(money(3, "NGN"), money(3, "NGN"))).toBe(100);
  });

  it("is zero for an empty target and capped at 100", () => {
    expect(savedPercent(money(0, "NGN"), money(0, "NGN"))).toBe(0);
    expect(savedPercent(money(5, "NGN"), money(3, "NGN"))).toBe(100);
  });

  it("refuses to compare different currencies", () => {
    expect(() => savedPercent(money(1, "NGN"), money(3, "GBP"))).toThrow();
  });
});
