// @vitest-environment node
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const visit = (path: string, cookie?: string) =>
  proxy(
    new NextRequest(`https://console.ajo.example${path}`, { headers: cookie ? { cookie } : {} }),
  );

describe("the first gate", () => {
  it("sends a visitor with no session cookie to the sign-in page from every console page", () => {
    for (const path of [
      "/",
      "/users",
      "/users/3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b",
      "/kyc",
      "/cases",
      "/audit",
      "/team",
    ]) {
      const res = visit(path);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://console.ajo.example/login");
    }
  });

  it("lets the sign-in and joining pages open for anyone, and every page carries the policy and nonce", () => {
    for (const path of ["/login", "/setup"]) {
      const res = visit(path);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-security-policy")).toMatch(
        /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
      );
    }
  });

  it("lets someone with a session cookie through to a console page (the API checks it for real)", () => {
    expect(visit("/users", "__Host-ajo_admin=sealed").status).toBe(200);
    expect(visit("/users", "ajo_admin=sealed").status).toBe(200);
    expect(visit("/users", "something_else=1").status).toBe(307);
  });
});
