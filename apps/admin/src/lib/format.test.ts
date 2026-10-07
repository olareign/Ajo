import { money, when, words } from "./format";

describe("formatting", () => {
  it("writes money from kobo and pence, with the symbol, grouping and two decimals", () => {
    expect(money("2500000", "NGN")).toBe("₦25,000.00");
    expect(money("5", "GBP")).toBe("£0.05");
    expect(money("123456789", "GBP")).toBe("£1,234,567.89");
    expect(money("-1500", "NGN")).toBe("-₦15.00");
    expect(money("100", "USD")).toBe("USD 1.00");
  });

  it("writes an exact 12-hour time, and a dash for nothing", () => {
    expect(when("2026-10-07T14:45:00Z")).toMatch(/^7 Oct 2026, \d{1,2}:45 (AM|PM)$/);
    expect(when(null)).toBe("–");
    expect(when("not a date")).toBe("–");
  });

  it("makes a stored word readable", () => {
    expect(words("written_off")).toBe("Written off");
    expect(words("open")).toBe("Open");
  });
});
