import { whenText } from "./when";

const now = new Date("2026-10-05T14:00:00Z"); // 3 PM in Lagos (UTC+1)
const lagos = "Africa/Lagos";

describe("whenText", () => {
  it("says today and yesterday with the exact 12-hour time", () => {
    expect(whenText("2026-10-05T13:45:00Z", now, lagos)).toBe("Today, 2:45 PM");
    expect(whenText("2026-10-04T08:10:00Z", now, lagos)).toBe("Yesterday, 9:10 AM");
    expect(whenText("2026-10-06T08:00:00Z", now, lagos)).toBe("Tomorrow, 9:00 AM");
  });

  it("gives the date for older moments, and the year only when it is not this year", () => {
    expect(whenText("2026-10-03T17:02:00Z", now, lagos)).toBe("3 Oct, 6:02 PM");
    expect(whenText("2025-10-03T17:02:00Z", now, lagos)).toBe("3 Oct 2025, 6:02 PM");
  });

  it("uses the person's own time zone for the day as well as the time", () => {
    // 11:30 PM on the 4th in London is already the 5th in Lagos.
    expect(whenText("2026-10-04T22:30:00Z", now, "Europe/London")).toBe("Yesterday, 11:30 PM");
    expect(whenText("2026-10-04T23:30:00Z", now, lagos)).toBe("Today, 12:30 AM");
  });

  it("shows nothing rather than a wrong time for a broken value", () => {
    expect(whenText("not a date", now, lagos)).toBe("");
  });
});
