import { addDays, dayText, longDayText, scheduleDates, todayIn } from "./schedule";

describe("the days of a plan", () => {
  it("counts daily and weekly from the start", () => {
    expect(scheduleDates("2026-10-30", "daily", 4)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(scheduleDates("2026-12-28", "weekly", 3)).toEqual([
      "2026-12-28",
      "2027-01-04",
      "2027-01-11",
    ]);
  });

  it("keeps the day of the month, and a short month does not drag the later ones", () => {
    expect(scheduleDates("2026-01-31", "monthly", 4)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
    expect(scheduleDates("2028-01-31", "monthly", 2)).toEqual(["2028-01-31", "2028-02-29"]);
  });

  it("adds days across a year end", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("says what day it is where the person lives, not in UTC", () => {
    expect(todayIn("NGN", new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
    expect(todayIn("GBP", new Date("2026-06-30T22:30:00Z"))).toBe("2026-06-30");
  });

  it("writes a day for a person, with no time zone shifting it", () => {
    expect(dayText("2026-11-08")).toBe("Sun 8 Nov");
    expect(longDayText("2026-11-08")).toBe("8 November 2026");
  });
});
