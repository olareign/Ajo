import { accountLabel, currencyName, describeTransaction } from "./wallet";

describe("describeTransaction", () => {
  it.each([
    ["funding", "Money added"],
    ["withdrawal", "Withdrawal"],
    ["reversal:funding", "Money added, reversed"],
    ["lock_deposit", "Lock deposit"],
    ["group-payout", "Group payout"],
  ])("turns %s into %s", (type, words) => {
    expect(describeTransaction(type)).toBe(words);
  });

  it("falls back to a plain word for a type it has never seen, never to nothing", () => {
    expect(describeTransaction("")).toBe("Wallet activity");
    expect(describeTransaction("::")).toBe("Wallet activity");
  });
});

describe("accountLabel", () => {
  it.each([
    ["available", "Available"],
    ["locked", "Locked"],
    ["savings", "Savings"],
  ] as const)("names the %s balance", (account, label) => {
    expect(accountLabel(account)).toBe(label);
  });
});

describe("currencyName", () => {
  it("spells a code out in words", () => {
    expect(currencyName("NGN")).toMatch(/naira/i);
    expect(currencyName("GBP")).toMatch(/pound/i);
  });

  it("keeps the code when it cannot be spelled out", () => {
    expect(currencyName("not a code")).toBe("not a code");
  });
});
