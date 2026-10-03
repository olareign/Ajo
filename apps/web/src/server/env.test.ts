// @vitest-environment node
import { loadServerEnv } from "./env";

describe("loadServerEnv", () => {
  const prod = {
    NODE_ENV: "production",
    API_BASE_URL: "https://api.ajo.example",
    SESSION_SECRET: "s".repeat(40),
  };

  it("accepts a valid production configuration", () => {
    expect(loadServerEnv(prod)).toMatchObject({
      apiBaseUrl: "https://api.ajo.example",
      production: true,
    });
  });

  it("uses local defaults in development", () => {
    const env = loadServerEnv({ NODE_ENV: "development" });
    expect(env.apiBaseUrl).toBe("http://localhost:4000");
    expect(env.sessionSecret.length).toBeGreaterThanOrEqual(32);
    expect(env.production).toBe(false);
  });

  it("requires an https API and a strong session secret in production", () => {
    expect(() => loadServerEnv({ ...prod, API_BASE_URL: "http://api.ajo.example" })).toThrow(
      /API_BASE_URL/,
    );
    expect(() => loadServerEnv({ ...prod, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
    expect(() => loadServerEnv({ ...prod, SESSION_SECRET: undefined })).toThrow(/SESSION_SECRET/);
  });

  describe("the Turnstile site key (public, but only ever read on the server)", () => {
    it("is optional: without it the sign-up form shows no check", () => {
      expect(loadServerEnv(prod).turnstileSiteKey).toBeUndefined();
      expect(loadServerEnv({ ...prod, TURNSTILE_SITE_KEY: "" }).turnstileSiteKey).toBeUndefined();
    });

    it("is passed on when it looks like a key", () => {
      expect(
        loadServerEnv({ ...prod, TURNSTILE_SITE_KEY: "0x4AAAAAAFM0tH6uB0tllz7t" }).turnstileSiteKey,
      ).toBe("0x4AAAAAAFM0tH6uB0tllz7t");
    });

    it("refuses something that is not a key, naming the variable and not its value", () => {
      const bad = "has spaces and <script>";
      expect(() => loadServerEnv({ ...prod, TURNSTILE_SITE_KEY: bad })).toThrow(
        /TURNSTILE_SITE_KEY/,
      );
      try {
        loadServerEnv({ ...prod, TURNSTILE_SITE_KEY: bad });
      } catch (error) {
        expect(String(error)).not.toContain(bad);
      }
    });
  });

  it("never echoes the secret in errors", () => {
    try {
      loadServerEnv({
        ...prod,
        API_BASE_URL: "nope",
        SESSION_SECRET: "leak-me-please-leak-me-please-123",
      });
    } catch (error) {
      expect(String(error)).not.toContain("leak-me");
    }
  });
});
