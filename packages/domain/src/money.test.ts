import { describe, expect, it } from "vitest";
import {
  CurrencyMismatchError,
  InvalidAmountError,
  add,
  allocate,
  applyBasisPoints,
  formatMoney,
  formatMoneyCompact,
  isZero,
  minorUnitDigits,
  money,
  multiply,
  parseMajor,
  subtract,
} from "./money";

describe("money", () => {
  it("stores amounts as integers in the currency's smallest unit", () => {
    expect(money(1_000_000, "NGN")).toEqual({ amount: 1_000_000, currency: "NGN" });
  });

  it("normalises the currency code to upper case", () => {
    expect(money(100, "gbp").currency).toBe("GBP");
  });

  it("rejects fractional amounts so floating point never reaches the ledger", () => {
    expect(() => money(10.5, "GBP")).toThrow(InvalidAmountError);
  });

  it("rejects amounts beyond the safe integer range", () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 1, "GBP")).toThrow(InvalidAmountError);
  });

  it("rejects malformed currency codes", () => {
    expect(() => money(100, "POUNDS")).toThrow(/currency/i);
  });
});

describe("minorUnitDigits", () => {
  it("knows naira, pounds and dollars have two decimal places", () => {
    expect(minorUnitDigits("NGN")).toBe(2);
    expect(minorUnitDigits("GBP")).toBe(2);
    expect(minorUnitDigits("USD")).toBe(2);
  });

  it("knows yen has no minor unit", () => {
    expect(minorUnitDigits("JPY")).toBe(0);
  });
});

describe("parseMajor", () => {
  it("parses user input with thousands separators into minor units", () => {
    expect(parseMajor("10,000", "NGN")).toEqual(money(1_000_000, "NGN"));
  });

  it("parses decimals without floating point error", () => {
    expect(parseMajor("0.29", "GBP")).toEqual(money(29, "GBP"));
    expect(parseMajor("1.1", "GBP")).toEqual(money(110, "GBP"));
  });

  it("ignores surrounding whitespace", () => {
    expect(parseMajor("  250 ", "USD")).toEqual(money(25_000, "USD"));
  });

  it("rejects more decimals than the currency allows", () => {
    expect(() => parseMajor("1.005", "GBP")).toThrow(InvalidAmountError);
    expect(() => parseMajor("100.5", "JPY")).toThrow(InvalidAmountError);
  });

  it("rejects text that is not a positive number", () => {
    for (const input of ["", "abc", "-5", "1.2.3", "1e5", "."]) {
      expect(() => parseMajor(input, "NGN"), input).toThrow(InvalidAmountError);
    }
  });
});

describe("arithmetic", () => {
  it("adds and subtracts amounts in the same currency", () => {
    expect(add(money(150, "GBP"), money(50, "GBP"))).toEqual(money(200, "GBP"));
    expect(subtract(money(150, "GBP"), money(50, "GBP"))).toEqual(money(100, "GBP"));
  });

  it("never mixes currencies", () => {
    expect(() => add(money(1, "GBP"), money(1, "NGN"))).toThrow(CurrencyMismatchError);
    expect(() => subtract(money(1, "GBP"), money(1, "NGN"))).toThrow(CurrencyMismatchError);
  });

  it("multiplies by a whole number, e.g. contribution times group size", () => {
    expect(multiply(money(1_000_000, "NGN"), 8)).toEqual(money(8_000_000, "NGN"));
  });

  it("refuses to multiply by a fraction", () => {
    expect(() => multiply(money(100, "GBP"), 1.5)).toThrow(InvalidAmountError);
  });

  it("detects zero", () => {
    expect(isZero(money(0, "GBP"))).toBe(true);
    expect(isZero(money(1, "GBP"))).toBe(false);
  });
});

describe("applyBasisPoints", () => {
  it("takes a percentage expressed in basis points (100 bps = 1%)", () => {
    expect(applyBasisPoints(money(100_000, "GBP"), 150)).toEqual(money(1_500, "GBP"));
  });

  it("rounds half up to the nearest minor unit", () => {
    // 1.5% of 33p = 0.495p -> 0p; 1.5% of 100p = 1.5p -> 2p
    expect(applyBasisPoints(money(33, "GBP"), 150)).toEqual(money(0, "GBP"));
    expect(applyBasisPoints(money(100, "GBP"), 150)).toEqual(money(2, "GBP"));
  });

  it("rejects negative or fractional basis points", () => {
    expect(() => applyBasisPoints(money(100, "GBP"), -1)).toThrow(InvalidAmountError);
    expect(() => applyBasisPoints(money(100, "GBP"), 1.5)).toThrow(InvalidAmountError);
  });
});

describe("allocate", () => {
  it("splits an amount by ratios without losing a single minor unit", () => {
    const parts = allocate(money(100, "GBP"), [1, 1, 1]);
    expect(parts.map((p) => p.amount)).toEqual([34, 33, 33]);
  });

  it("splits by uneven ratios", () => {
    const parts = allocate(money(1_000, "NGN"), [70, 30]);
    expect(parts.map((p) => p.amount)).toEqual([700, 300]);
  });

  it("needs at least one positive ratio", () => {
    expect(() => allocate(money(100, "GBP"), [])).toThrow();
    expect(() => allocate(money(100, "GBP"), [0, 0])).toThrow();
    expect(() => allocate(money(100, "GBP"), [1, -1])).toThrow();
  });
});

describe("formatMoney", () => {
  it("formats naira the way the designs show it, without empty decimals", () => {
    expect(formatMoney(money(7_000_000, "NGN"), "en-NG")).toBe("₦70,000");
  });

  it("keeps decimals when there are pence", () => {
    expect(formatMoney(money(10_050, "GBP"), "en-GB")).toBe("£100.50");
  });

  it("formats for the user's locale", () => {
    expect(formatMoney(money(10_000, "EUR"), "de-DE")).toBe("100\u00a0€");
  });
});

describe("formatMoneyCompact", () => {
  it("abbreviates large amounts for cards, e.g. 10k weekly", () => {
    expect(formatMoneyCompact(money(1_000_000, "NGN"), "en-NG")).toBe("₦10K");
    expect(formatMoneyCompact(money(500_000_000, "NGN"), "en-NG")).toBe("₦5M");
  });
});
