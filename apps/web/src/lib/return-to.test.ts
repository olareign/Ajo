import { rememberReturn, safeReturn, takeReturn } from "./return-to";

afterEach(() => localStorage.clear());

describe("returning to an invite", () => {
  it("accepts only invite pages inside the app", () => {
    expect(safeReturn("/join/ADA-SAVES")).toBe("/join/ADA-SAVES");
    expect(safeReturn("/circles/join/K7M2QH9R")).toBe("/circles/join/K7M2QH9R");
    for (const bad of [
      "https://evil.example/join/ADA1",
      "//evil.example/join/ADA1",
      "/\\evil.example",
      "/join/ADA1?next=https://evil.example",
      "/join/../wallet/withdraw",
      "/wallet/withdraw",
      "/join/",
      "javascript:alert(1)",
      null,
      undefined,
    ]) {
      expect(safeReturn(bad)).toBeNull();
    }
  });

  it("remembers an invite once, and forgets it after reading", () => {
    rememberReturn("/join/ADA-SAVES", 1000);
    expect(takeReturn(2000)).toBe("/join/ADA-SAVES");
    expect(takeReturn(3000)).toBeNull();
  });

  it("will not remember anything else, or return something stored by other means", () => {
    rememberReturn("/wallet/withdraw");
    expect(takeReturn()).toBeNull();
    localStorage.setItem(
      "ajo-return-to",
      JSON.stringify({ path: "//evil.example", at: Date.now() }),
    );
    expect(takeReturn()).toBeNull();
    localStorage.setItem("ajo-return-to", "not json");
    expect(takeReturn()).toBeNull();
  });

  it("lets an invite go after a day", () => {
    rememberReturn("/join/ADA-SAVES", 0);
    expect(takeReturn(24 * 60 * 60 * 1000 + 1)).toBeNull();
  });
});
