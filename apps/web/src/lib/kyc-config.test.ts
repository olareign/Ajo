import {
  countryConfig,
  namesMatch,
  validateAccount,
  validateBvn,
  validateIdNumber,
} from "./kyc-config";

describe("countryConfig", () => {
  it("knows Nigeria and the UK, and nothing else", () => {
    expect(countryConfig("NG")).toMatchObject({ currency: "NGN", name: "Nigeria" });
    expect(countryConfig("GB")).toMatchObject({ currency: "GBP", name: "United Kingdom" });
    expect(countryConfig(null)).toBeNull();
    expect(countryConfig("US" as never)).toBeNull();
  });

  it("offers each country's own IDs and bank details, and BVN only in Nigeria", () => {
    const ng = countryConfig("NG")!;
    const gb = countryConfig("GB")!;
    expect(ng.idTypes.map((t) => t.value)).toContain("nin");
    expect(gb.idTypes.map((t) => t.value)).not.toContain("nin");
    expect(ng.bank.kind).toBe("ng");
    expect(gb.bank.kind).toBe("uk");
    expect(ng.nationalCheck).toBeDefined();
    expect(gb.nationalCheck).toBeUndefined();
  });
});

describe("validateIdNumber", () => {
  it("wants exactly 11 digits for a Nigerian NIN", () => {
    expect(validateIdNumber("NG", "nin", "12345678901")).toBe(true);
    expect(validateIdNumber("NG", "nin", "1234567890")).toBe(false);
    expect(validateIdNumber("NG", "nin", "1234567890a")).toBe(false);
  });
  it("takes spaces and capitals out before checking other IDs", () => {
    expect(validateIdNumber("NG", "passport", " a12345678 ")).toBe(true);
    expect(validateIdNumber("GB", "passport", "123456789")).toBe(true);
    expect(validateIdNumber("GB", "passport", "12345")).toBe(false);
  });
  it("refuses an ID type the country does not accept", () => {
    expect(validateIdNumber("GB", "nin", "12345678901")).toBe(false);
  });
});

describe("validateBvn", () => {
  it("is 11 digits", () => {
    expect(validateBvn("22334455667")).toBe(true);
    expect(validateBvn("2233445566")).toBe(false);
  });
});

describe("validateAccount", () => {
  it("wants a 10-digit account number and a chosen bank in Nigeria", () => {
    expect(validateAccount("NG", { bank: "058", number: "0123456789" })).toBe(true);
    expect(validateAccount("NG", { bank: "", number: "0123456789" })).toBe(false);
    expect(validateAccount("NG", { bank: "058", number: "12345" })).toBe(false);
  });
  it("wants a 6-digit sort code and an 8-digit account number in the UK, dashes allowed", () => {
    expect(validateAccount("GB", { sortCode: "12-34-56", number: "12345678" })).toBe(true);
    expect(validateAccount("GB", { sortCode: "123456", number: "12345678" })).toBe(true);
    expect(validateAccount("GB", { sortCode: "1234", number: "12345678" })).toBe(false);
    expect(validateAccount("GB", { sortCode: "123456", number: "1234" })).toBe(false);
  });
});

describe("namesMatch", () => {
  it("ignores capitals, punctuation and the order of names", () => {
    expect(namesMatch("ADA OLA", "Ada Ola")).toBe(true);
    expect(namesMatch("OLA, ADA", "Ada Ola")).toBe(true);
  });
  it("accepts a bank that holds only some of the names, or more of them", () => {
    expect(namesMatch("ADA OLAMIDE OLA", "Ada Ola")).toBe(true);
    expect(namesMatch("ADA OLA", "Ada Olamide Ola")).toBe(true);
  });
  it("refuses another person, or a shared first name alone", () => {
    expect(namesMatch("CHIDI OKAFOR", "Ada Ola")).toBe(false);
    expect(namesMatch("ADA BELLO", "Ada Ola")).toBe(false);
  });
  it("accepts a one-word name only when it is the same word", () => {
    expect(namesMatch("ADA", "Ada")).toBe(true);
    expect(namesMatch("BOLA", "Ada")).toBe(false);
  });
});
