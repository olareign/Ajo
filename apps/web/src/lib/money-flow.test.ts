import {
  FUND_METHODS,
  limitsFor,
  mandateCopy,
  QUICK_AMOUNTS,
  toMinor,
  withdrawOutcome,
} from "./money-flow";

describe("toMinor", () => {
  it("turns whole naira or pounds into kobo or pence, exactly", () => {
    expect(toMinor("5000")).toBe("500000");
    expect(toMinor("1")).toBe("100");
    expect(toMinor("0")).toBe("0");
  });
  it("copes with leading zeros and very large amounts without rounding", () => {
    expect(toMinor("0050")).toBe("5000");
    expect(toMinor("9007199254740993")).toBe("900719925474099300");
  });
  it("is zero for nothing typed", () => {
    expect(toMinor("")).toBe("0");
  });
});

describe("what each country can use", () => {
  it("offers Nigeria card, transfer and USSD, and the UK bank transfer only (Direct Debit funding comes later)", () => {
    expect(FUND_METHODS.NG.map((m) => m.value)).toEqual(["card", "transfer", "ussd"]);
    expect(FUND_METHODS.GB.map((m) => m.value)).toEqual(["transfer"]);
  });
  it("has quick amounts in ascending order for each", () => {
    for (const country of ["NG", "GB"] as const) {
      const amounts = QUICK_AMOUNTS[country];
      expect([...amounts].sort((a, b) => a - b)).toEqual(amounts);
      expect(amounts.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("limitsFor", () => {
  it("has a ladder from nothing to tier 2 in Nigeria, and only tier 1 in the UK", () => {
    expect(limitsFor("NG").map((t) => t.tier)).toEqual([0, 1, 2]);
    expect(limitsFor("GB").map((t) => t.tier)).toEqual([0, 1]);
  });
  it("lets tier 0 move nothing, and each tier move more than the last", () => {
    const ng = limitsFor("NG");
    expect(ng[0]).toMatchObject({ daily: 0, perTransaction: 0 });
    expect(ng[2]!.daily).toBeGreaterThan(ng[1]!.daily);
    expect(ng[2]!.perTransaction).toBeGreaterThan(ng[1]!.perTransaction);
  });
});

describe("mandateCopy", () => {
  it("describes each country's own scheme", () => {
    expect(mandateCopy("NG").scheme).toMatch(/NIBSS/);
    expect(mandateCopy("GB").scheme).toMatch(/Bacs/);
  });
});

describe("withdrawOutcome", () => {
  it("sends it, unless the amount ends 666 (a sample bank refusal that is reversed)", () => {
    expect(withdrawOutcome("5000")).toBe("arrived");
    expect(withdrawOutcome("13666")).toBe("reversed");
  });
});
