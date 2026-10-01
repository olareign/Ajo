import { describe, expect, it } from "vitest";
import { money } from "../money";
import {
  DEFAULT_RULES,
  earlySpotCount,
  requiredDeposit,
  roundPayout,
  validateGroupSetup,
} from "./rules";

const tenThousandNaira = money(1_000_000, "NGN");

describe("earlySpotCount", () => {
  it("reserves the first 30% of spots (spots 1-3 in a group of 10)", () => {
    expect(earlySpotCount(10)).toBe(3);
  });

  it("rounds down, but always reserves at least one spot", () => {
    expect(earlySpotCount(8)).toBe(2);
    expect(earlySpotCount(2)).toBe(1);
  });

  it("can be tuned while the rule is still an open question", () => {
    expect(earlySpotCount(10, { ...DEFAULT_RULES, earlySpotPercent: 50 })).toBe(5);
  });
});

describe("requiredDeposit", () => {
  it("is nothing for a trusted member", () => {
    expect(
      requiredDeposit({ contribution: tenThousandNaira, trusted: true, earlySpot: true }),
    ).toEqual(money(0, "NGN"));
  });

  it("is one round's contribution for an untrusted member", () => {
    expect(
      requiredDeposit({ contribution: tenThousandNaira, trusted: false, earlySpot: false }),
    ).toEqual(tenThousandNaira);
  });

  it("is larger when an untrusted member takes an early spot", () => {
    expect(
      requiredDeposit({ contribution: tenThousandNaira, trusted: false, earlySpot: true }),
    ).toEqual(money(2_000_000, "NGN"));
  });
});

describe("roundPayout", () => {
  it("pays the whole pot minus the payout fee", () => {
    // 10 members x £100, 1.5% fee
    expect(
      roundPayout({ contribution: money(10_000, "GBP"), size: 10, feeBasisPoints: 150 }),
    ).toEqual({
      gross: money(100_000, "GBP"),
      fee: money(1_500, "GBP"),
      net: money(98_500, "GBP"),
    });
  });

  it("allows a zero fee", () => {
    const payout = roundPayout({ contribution: tenThousandNaira, size: 8, feeBasisPoints: 0 });
    expect(payout.net).toEqual(money(8_000_000, "NGN"));
  });
});

describe("validateGroupSetup", () => {
  const valid = {
    name: "Aso Ebi",
    contribution: tenThousandNaira,
    size: 8,
    frequency: "weekly" as const,
    startDate: "2026-10-05",
    today: "2026-10-01",
  };

  it("accepts the Private Group Setup example from the designs", () => {
    expect(validateGroupSetup(valid)).toEqual([]);
  });

  it("lists every problem so the form can show them together", () => {
    expect(
      validateGroupSetup({
        ...valid,
        name: "  ",
        contribution: money(0, "NGN"),
        size: 1,
        startDate: "2026-09-30",
      }),
    ).toEqual(["name_required", "contribution_positive", "size_out_of_range", "start_date_past"]);
  });

  it("caps group size at the maximum (12 in the designs)", () => {
    expect(validateGroupSetup({ ...valid, size: 13 })).toEqual(["size_out_of_range"]);
    expect(validateGroupSetup({ ...valid, size: 12 })).toEqual([]);
    expect(validateGroupSetup({ ...valid, size: 2.5 })).toEqual(["size_out_of_range"]);
  });

  it("allows a start date of today", () => {
    expect(validateGroupSetup({ ...valid, startDate: valid.today })).toEqual([]);
  });
});
