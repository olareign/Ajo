import { randomBytes } from "node:crypto";

export type ServerEnv = Readonly<{
  apiBaseUrl: string;
  sessionSecret: string;
  production: boolean;
  /** Shared with the API, so it sees each staff member's own address and device. Never sent to the browser. */
  bffSecret?: string;
}>;

const DEV_SECRET = randomBytes(32).toString("base64url");

/** Server-only settings. Errors name variables, never their values. */
export function loadServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const production = source.NODE_ENV === "production";
  const apiBaseUrl = source.API_BASE_URL ?? (production ? "" : "http://localhost:4000");
  const sessionSecret = source.ADMIN_SESSION_SECRET ?? (production ? "" : DEV_SECRET);
  const problems: string[] = [];
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
  if (sessionSecret.length < 32)
    problems.push("ADMIN_SESSION_SECRET: must be at least 32 characters");
  if (problems.length > 0) throw new Error(`Invalid server configuration: ${problems.join("; ")}`);
  return {
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    sessionSecret,
    production,
    ...(bffSecret ? { bffSecret } : {}),
  };
}
