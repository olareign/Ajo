// @vitest-environment node
import { isSameOrigin } from "./same-origin";

const url = "https://app.ajo.example/api/auth/sign-in";

describe("isSameOrigin", () => {
  it("trusts the browser's Sec-Fetch-Site header", () => {
    expect(
      isSameOrigin(
        new Request(url, { method: "POST", headers: { "Sec-Fetch-Site": "same-origin" } }),
      ),
    ).toBe(true);
    expect(
      isSameOrigin(
        new Request(url, { method: "POST", headers: { "Sec-Fetch-Site": "cross-site" } }),
      ),
    ).toBe(false);
    expect(
      isSameOrigin(
        new Request(url, { method: "POST", headers: { "Sec-Fetch-Site": "same-site" } }),
      ),
    ).toBe(false);
  });

  it("falls back to comparing the Origin header", () => {
    expect(
      isSameOrigin(
        new Request(url, { method: "POST", headers: { Origin: "https://app.ajo.example" } }),
      ),
    ).toBe(true);
    expect(
      isSameOrigin(
        new Request(url, { method: "POST", headers: { Origin: "https://evil.example" } }),
      ),
    ).toBe(false);
  });

  it("rejects requests that prove nothing about where they came from", () => {
    expect(isSameOrigin(new Request(url, { method: "POST" }))).toBe(false);
  });
});
