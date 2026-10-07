import { sealData, unsealData } from "iron-session";

/** The most a staff session can last, matching the API's own limit (it ends it sooner when idle). */
export const SESSION_MAX_SECONDS = 8 * 60 * 60;

export type Session = Readonly<{ token: string }>;

/** Encrypts and authenticates data for a cookie (iron: AES-256-CBC + HMAC-SHA-256). */
export function seal(data: object, secret: string, ttlSeconds: number): Promise<string> {
  return sealData(data, { password: secret, ttl: ttlSeconds });
}

/** Opens a sealed cookie; anything tampered, expired or sealed with another key is null. */
export async function openSeal<T>(sealed: string | undefined, secret: string): Promise<T | null> {
  if (!sealed) return null;
  try {
    const data = await unsealData<T>(sealed, { password: secret });
    return data && typeof data === "object" && Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}

type CookieSpec = {
  name: string;
  options: { httpOnly: true; secure: boolean; sameSite: "strict"; path: "/"; maxAge?: number };
};

/** `__Host-` pins the cookie to this exact host over HTTPS; JavaScript can never read it. */
export function sessionCookie(production: boolean, maxAge = SESSION_MAX_SECONDS): CookieSpec {
  return {
    name: production ? "__Host-ajo_admin" : "ajo_admin",
    options: { httpOnly: true, secure: production, sameSite: "strict", path: "/", maxAge },
  };
}
