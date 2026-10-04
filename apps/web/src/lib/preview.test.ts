import { previewRefusal, previewAccountName } from "./preview";

describe("previewRefusal", () => {
  it("lets a reviewer see a refusal by ending an ID or BVN in 0000", () => {
    expect(previewRefusal("id", { number: "12345670000" })).toMatch(/couldn.t match that ID/);
    expect(previewRefusal("national_check", { number: "22334450000" })).toMatch(/BVN/);
  });

  it("refuses a document called blurry", () => {
    expect(previewRefusal("address", { file: "blurry-bill.jpg" })).toMatch(/hard to read/);
  });

  it("otherwise approves", () => {
    expect(previewRefusal("id", { number: "12345678901" })).toBeNull();
    expect(previewRefusal("selfie", {})).toBeNull();
    expect(previewRefusal("location", {})).toBeNull();
    expect(previewRefusal("address", { file: "bill.pdf" })).toBeNull();
  });
});

describe("previewAccountName", () => {
  it("answers with the person's own name, so the account matches", () => {
    expect(previewAccountName("0123456789", "Ada Ola")).toBe("ADA OLA");
  });
  it("answers with someone else's when the number ends 0000, so a mismatch can be seen", () => {
    expect(previewAccountName("0123450000", "Ada Ola")).toBe("CHIDI OKAFOR");
  });
});
