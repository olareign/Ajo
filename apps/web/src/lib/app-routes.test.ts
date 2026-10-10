import { isAppRoute, isFullWidthRoute, isPublicPage } from "./app-routes";

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

  it("lets the public pages lay themselves out at every width, and sign-in on a desk", () => {
    for (const path of ["/how-it-works", "/safety", "/about", "/help", "/terms", "/privacy"]) {
      expect(isPublicPage(path)).toBe(true);
      expect(isFullWidthRoute(path)).toBe(true);
    }
    for (const path of ["/sign-in", "/sign-up", "/forgot-password"]) {
      expect(isPublicPage(path)).toBe(false);
      expect(isFullWidthRoute(path)).toBe(true);
    }
    for (const path of ["/helpful", "/aboutus", "/me/help"]) expect(isPublicPage(path)).toBe(false);
  });
});
