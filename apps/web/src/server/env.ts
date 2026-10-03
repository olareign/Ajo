import { randomBytes } from "node:crypto";

export type ServerEnv = Readonly<{
  apiBaseUrl: string;
  sessionSecret: string;
  production: boolean;
  /** Cloudflare Turnstile's public site key. Without one the sign-up form shows no check. */
  turnstileSiteKey?: string;
  /**
   * Shared with the API. When set, each call tells the API the visitor's own address and device, proved
   * by this secret, so rate limits and sign-in alerts are per person. Never sent to the browser.
   */
  bffSecret?: string;
}>;

const SITE_KEY = /^[0-9A-Za-z_-]{8,64}$/;

const DEV_SECRET = randomBytes(32).toString("base64url");

/** Server-only settings for the BFF. Errors name variables, never their values. */
export function loadServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const production = source.NODE_ENV === "production";
  const apiBaseUrl = source.API_BASE_URL ?? (production ? "" : "http://localhost:4000");
  const sessionSecret = source.SESSION_SECRET ?? (production ? "" : DEV_SECRET);
  const problems: string[] = [];
  const siteKey = source.TURNSTILE_SITE_KEY?.trim() || undefined;
  if (siteKey && !SITE_KEY.test(siteKey)) problems.push("TURNSTILE_SITE_KEY: not a valid key");
  const bffSecret = source.BFF_SHARED_SECRET || undefined;
  if (bffSecret !== undefined && bffSecret.length < 32)
    problems.push("BFF_SHARED_SECRET: must be at least 32 characters");

  let url: URL | null = null;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    problems.push("API_BASE_URL: must be a URL");
  }
  if (url && production && url.protocol !== "https:")
    problems.push("API_BASE_URL: must use https in production");
  if (sessionSecret.length < 32) problems.push("SESSION_SECRET: must be at least 32 characters");

  if (problems.length > 0) throw new Error(`Invalid server configuration: ${problems.join("; ")}`);
  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    sessionSecret,
    production,
    ...(siteKey ? { turnstileSiteKey: siteKey } : {}),
    ...(bffSecret ? { bffSecret } : {}),
  };
}
