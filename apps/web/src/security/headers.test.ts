import { buildContentSecurityPolicy, createNonce, staticSecurityHeaders } from "./headers";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split(";").map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values.join(" ")];
    }),
  );

describe("buildContentSecurityPolicy", () => {
  const prod = directives(buildContentSecurityPolicy({ nonce: "abc123", isDev: false }));

  it("only runs scripts carrying this request's nonce", () => {
    expect(prod["script-src"]).toBe("'self' 'nonce-abc123' 'strict-dynamic'");
  });

  it("never allows eval or inline scripts in production", () => {
    expect(prod["script-src"]).not.toContain("unsafe-eval");
    expect(prod["script-src"]).not.toContain("unsafe-inline");
  });

  it("allows eval only in development, where React needs it for error overlays", () => {
    const dev = directives(buildContentSecurityPolicy({ nonce: "n", isDev: true }));
    expect(dev["script-src"]).toContain("'unsafe-eval'");
  });

  it("lets the browser talk only to our own origin (the BFF), never straight to the API", () => {
    expect(prod["connect-src"]).toBe("'self'");
  });

  it("lets the page show Cloudflare's check in a frame, and nothing else in one", () => {
    expect(prod["frame-src"]).toBe("https://challenges.cloudflare.com");
  });

  it("does not open script-src to a host: Cloudflare's script is loaded by our own trusted script", () => {
    expect(prod["script-src"]).not.toContain("cloudflare");
  });

  it("blocks framing, plugins, base-tag hijacking and off-site form posts", () => {
    expect(prod["frame-ancestors"]).toBe("'none'");
    expect(prod["object-src"]).toBe("'none'");
    expect(prod["base-uri"]).toBe("'self'");
    expect(prod["form-action"]).toBe("'self'");
    expect(prod["default-src"]).toBe("'self'");
  });

  it("upgrades insecure requests in production only", () => {
    expect(prod).toHaveProperty("upgrade-insecure-requests");
    const dev = directives(buildContentSecurityPolicy({ nonce: "n", isDev: true }));
    expect(dev).not.toHaveProperty("upgrade-insecure-requests");
  });

  it("rejects a nonce that could break out of the header", () => {
    expect(() => buildContentSecurityPolicy({ nonce: "x'; script-src *", isDev: false })).toThrow();
  });
});

describe("createNonce", () => {
  it("is unpredictable: 128 bits, base64, different every time", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});

describe("staticSecurityHeaders", () => {
  const headers = Object.fromEntries(staticSecurityHeaders().map((h) => [h.key, h.value]));

  it("forces HTTPS for two years, including subdomains", () => {
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("stops MIME sniffing, framing and referrer leaks", () => {
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("isolates the browsing context from other windows", () => {
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("only allows the device features the app will need (camera for KYC selfies, location for KYC)", () => {
    expect(headers["Permissions-Policy"]).toBe(
      "camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), interest-cohort=()",
    );
  });
});
