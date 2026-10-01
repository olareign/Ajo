import { formatMoney, formatMoneyCompact, MoneyFormatError } from "./money-format";

describe("formatMoney", () => {
  it("formats integer minor units from the API without floating point", () => {
    expect(formatMoney({ amount: "7000000", currency: "NGN" }, "en-NG")).toBe("₦70,000");
  });

  it("keeps decimals only when there are some", () => {
    expect(formatMoney({ amount: "10050", currency: "GBP" }, "en-GB")).toBe("£100.50");
    expect(formatMoney({ amount: "5", currency: "GBP" }, "en-GB")).toBe("£0.05");
  });

  it("is exact for amounts beyond JavaScript's safe integer range", () => {
    expect(formatMoney({ amount: "900719925474099312", currency: "USD" }, "en-US")).toBe(
      "$9,007,199,254,740,993.12",
    );
  });

  it("handles negative amounts such as reversals", () => {
    expect(formatMoney({ amount: "-2500", currency: "GBP" }, "en-GB")).toBe("-£25");
  });

  it("handles currencies without a minor unit", () => {
    expect(formatMoney({ amount: "1500", currency: "JPY" }, "en-US")).toBe("¥1,500");
  });

  it("formats for the user's locale", () => {
    expect(formatMoney({ amount: "10000", currency: "EUR" }, "de-DE")).toBe("100 €");
  });

  it("rejects anything that is not an integer string, so bad data never displays as money", () => {
    for (const amount of ["", "1.5", "1e5", "abc", " 1", "--1"]) {
      expect(() => formatMoney({ amount, currency: "NGN" }, "en-NG"), amount).toThrow(
        MoneyFormatError,
      );
    }
  });

  it("rejects malformed currency codes", () => {
    expect(() => formatMoney({ amount: "1", currency: "naira" }, "en-NG")).toThrow(
      MoneyFormatError,
    );
  });
});

describe("formatMoneyCompact", () => {
  it("abbreviates for cards and chips", () => {
    expect(formatMoneyCompact({ amount: "1000000", currency: "NGN" }, "en-NG")).toBe("₦10K");
    expect(formatMoneyCompact({ amount: "500000000", currency: "NGN" }, "en-NG")).toBe("₦5M");
  });
});
