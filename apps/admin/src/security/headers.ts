/**
 * Browser security headers for the staff console. Stricter than the customer app's: it never loads
 * anything from another origin, never uses the camera or location, and is never put in a frame.
 * The CSP is built per request with a fresh nonce (see src/proxy.ts); the rest are static.
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
    "style-src-attr 'unsafe-inline'",
    // The authenticator QR is drawn as an inline image.
    "img-src 'self' data:",
    "font-src 'self'",
    // The browser only talks to this origin; the BFF calls the API server-side.
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'none'",
    "worker-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

export function staticSecurityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    { key: "Cache-Control", value: "no-store" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), geolocation=(), microphone=(), payment=(), usb=(), interest-cohort=(), clipboard-read=()",
    },
  ];
}
