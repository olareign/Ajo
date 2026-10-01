// @vitest-environment node
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("proxy", () => {
  it("sets a fresh nonce-based CSP on every response", () => {
    const first = proxy(new NextRequest("https://ajo.example/"));
    const second = proxy(new NextRequest("https://ajo.example/"));
    const csp = first.headers.get("Content-Security-Policy");

    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(second.headers.get("Content-Security-Policy")).not.toBe(csp);
  });

  it("passes the nonce to rendering so Next.js can stamp its own scripts", () => {
    const response = proxy(new NextRequest("https://ajo.example/"));
    const nonce = /'nonce-([^']+)'/.exec(
      response.headers.get("Content-Security-Policy") ?? "",
    )?.[1];
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  });
});
