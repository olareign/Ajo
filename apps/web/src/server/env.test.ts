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
