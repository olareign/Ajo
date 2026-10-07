import { buildContentSecurityPolicy, createNonce, staticSecurityHeaders } from "./headers";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split(";").map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values.join(" ")];
    }),
  );

describe("the console's content security policy", () => {
  const prod = directives(buildContentSecurityPolicy({ nonce: "abc123", isDev: false }));

  it("only runs scripts carrying this request's nonce, never eval or inline ones in production", () => {
    expect(prod["script-src"]).toBe("'self' 'nonce-abc123' 'strict-dynamic'");
    const dev = directives(buildContentSecurityPolicy({ nonce: "n", isDev: true }));
    expect(dev["script-src"]).toContain("'unsafe-eval'");
  });

  it("talks only to its own origin, and allows no frames, workers, manifests or other origins' images", () => {
    expect(prod["connect-src"]).toBe("'self'");
    expect(prod["frame-src"]).toBe("'none'");
    expect(prod["worker-src"]).toBe("'none'");
    expect(prod["manifest-src"]).toBe("'none'");
    expect(prod["img-src"]).toBe("'self' data:");
    expect(prod["default-src"]).toBe("'self'");
  });

  it("blocks framing, plugins, base-tag hijacking and off-site form posts, and upgrades in production only", () => {
    expect(prod["frame-ancestors"]).toBe("'none'");
    expect(prod["object-src"]).toBe("'none'");
    expect(prod["base-uri"]).toBe("'self'");
    expect(prod["form-action"]).toBe("'self'");
    expect(prod).toHaveProperty("upgrade-insecure-requests");
    expect(directives(buildContentSecurityPolicy({ nonce: "n", isDev: true }))).not.toHaveProperty(
      "upgrade-insecure-requests",
    );
  });

  it("rejects a nonce that could break out of the header", () => {
    expect(() => buildContentSecurityPolicy({ nonce: "x'; script-src *", isDev: false })).toThrow();
  });
});

describe("createNonce and the static headers", () => {
  it("makes an unpredictable 128-bit nonce each time", () => {
    const [a, b] = [createNonce(), createNonce()];
    expect(a).not.toBe(b);
    expect(atob(a)).toHaveLength(16);
  });

  it("keeps pages out of search engines and caches, and sends no referrer", () => {
    const headers = Object.fromEntries(staticSecurityHeaders().map((h) => [h.key, h.value]));
    expect(headers["X-Robots-Tag"]).toContain("noindex");
    expect(headers["Cache-Control"]).toBe("no-store");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
  });
});
