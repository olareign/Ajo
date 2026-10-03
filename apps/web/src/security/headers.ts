/**
 * Browser security headers. The CSP is built per request with a fresh nonce (see
 * src/proxy.ts); the rest are static and set for every route in next.config.ts.
 */
const NONCE = /^[A-Za-z0-9+/]+={0,2}$/;

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function buildContentSecurityPolicy({
  nonce,
  isDev,
}: Readonly<{ nonce: string; isDev: boolean }>): string {
  if (!NONCE.test(nonce)) {
    throw new Error("Invalid CSP nonce");
  }
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // React renders style attributes (e.g. progress bar widths); style injection cannot run code.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // The browser only talks to this origin; the BFF calls the API server-side.
    "connect-src 'self'",
    // Cloudflare Turnstile's check (sign-up) is drawn in a frame from its own origin. Its script is
    // not listed under script-src: our trusted script loads it, which 'strict-dynamic' allows.
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

export function staticSecurityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), interest-cohort=()",
    },
  ];
}
