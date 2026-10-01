import { describe, expect, it } from "vitest";
import { planRounds, slotsRemaining } from "./rounds";

const assignments = [
  { memberId: "ada", spot: 2 },
  { memberId: "bo", spot: 1 },
  { memberId: "cy", spot: 3 },
];

describe("planRounds", () => {
  it("has one round per member and pays spot N in round N", () => {
    const rounds = planRounds({ startDate: "2026-10-05", frequency: "weekly", assignments });
    expect(rounds).toEqual([
      { number: 1, collectionDate: "2026-10-05", recipientId: "bo" },
      { number: 2, collectionDate: "2026-10-12", recipientId: "ada" },
      { number: 3, collectionDate: "2026-10-19", recipientId: "cy" },
    ]);
  });

  it("collects monthly on the same day of the month", () => {
    const rounds = planRounds({ startDate: "2026-01-31", frequency: "monthly", assignments });
    expect(rounds.map((r) => r.collectionDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("refuses an incomplete or duplicated payout order", () => {
    expect(() =>
      planRounds({
        startDate: "2026-10-05",
        frequency: "weekly",
        assignments: [
          { memberId: "ada", spot: 1 },
          { memberId: "bo", spot: 1 },
        ],
      }),
    ).toThrow(/spot/i);
    expect(() =>
      planRounds({ startDate: "2026-10-05", frequency: "weekly", assignments: [] }),
    ).toThrow(/spot/i);
    expect(() =>
      planRounds({
        startDate: "2026-10-05",
        frequency: "weekly",
        assignments: [
          { memberId: "ada", spot: 1 },
          { memberId: "bo", spot: 3 },
        ],
      }),
    ).toThrow(/missing spot 2/i);
  });
});

describe("slotsRemaining", () => {
  it("reports open slots the way group cards show them", () => {
    expect(slotsRemaining({ size: 7, memberCount: 5 })).toEqual({
      remaining: 2,
      size: 7,
      full: false,
    });
    expect(slotsRemaining({ size: 7, memberCount: 7 })).toEqual({
      remaining: 0,
      size: 7,
      full: true,
    });
  });
});
