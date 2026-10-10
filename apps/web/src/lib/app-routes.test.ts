import { isAppRoute, isFullWidthRoute } from "./app-routes";

describe("which pages are inside the app", () => {
  it("knows the signed-in sections and the pages under them", () => {
    for (const path of [
      "/today",
      "/wallet",
      "/wallet/statements",
      "/circles/abc/board",
      "/me/photo",
      "/insights",
      "/notifications",
    ]) {
      expect(isAppRoute(path)).toBe(true);
    }
  });

  it("leaves out sign-in, sign-up, the welcome and landing page, invites and the public pages", () => {
    for (const path of [
      "/",
      "/sign-in",
      "/sign-up",
      "/onboarding",
      "/join/ABCD",
      "/help",
      "/terms",
      "/todayx",
      "/wallets",
    ]) {
      expect(isAppRoute(path)).toBe(false);
    }
    expect(isFullWidthRoute("/")).toBe(true);
    expect(isFullWidthRoute("/today")).toBe(false);
  });
});
