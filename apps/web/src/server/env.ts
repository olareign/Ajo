import { randomBytes } from "node:crypto";

export type ServerEnv = Readonly<{ apiBaseUrl: string; sessionSecret: string; production: boolean }>;

const DEV_SECRET = randomBytes(32).toString("base64url");

/** Server-only settings for the BFF. Errors name variables, never their values. */
export function loadServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const production = source.NODE_ENV === "production";
  const apiBaseUrl = source.API_BASE_URL ?? (production ? "" : "http://localhost:4000");
  const sessionSecret = source.SESSION_SECRET ?? (production ? "" : DEV_SECRET);
  const problems: string[] = [];

  let url: URL | null = null;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    problems.push("API_BASE_URL: must be a URL");
  }
  if (url && production && url.protocol !== "https:") problems.push("API_BASE_URL: must use https in production");
  if (sessionSecret.length < 32) problems.push("SESSION_SECRET: must be at least 32 characters");

  if (problems.length > 0) throw new Error(`Invalid server configuration: ${problems.join("; ")}`);
  return { apiBaseUrl: apiBaseUrl.replace(/\/$/, ""), sessionSecret, production };
}
