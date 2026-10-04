import { sealData, unsealData } from "iron-session";

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const MFA_TTL_SECONDS = 5 * 60;

export type Session = Readonly<{ accessToken: string; refreshToken: string }>;
export type MfaChallenge = Readonly<{ mfaToken: string }>;

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
export function sessionCookie(production: boolean, maxAge = SESSION_TTL_SECONDS): CookieSpec {
  return {
    name: production ? "__Host-ajo_session" : "ajo_session",
    options: { httpOnly: true, secure: production, sameSite: "strict", path: "/", maxAge },
  };
}

/** The API forgets a device after 30 unused days; the cookie outlives that so the API decides. */
export const DEVICE_TTL_SECONDS = 90 * 24 * 60 * 60;
const DEVICE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Holds the secret of a device the person asked to be remembered on. Never readable by scripts. */
export function deviceCookie(production: boolean): CookieSpec {
  return {
    name: production ? "__Host-ajo_device" : "ajo_device",
    options: {
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      path: "/",
      maxAge: DEVICE_TTL_SECONDS,
    },
  };
}

/** Only a well-formed secret is passed on: anything else in the cookie is ignored. */
export const isDeviceToken = (value: unknown): value is string =>
  typeof value === "string" && DEVICE_TOKEN.test(value);

export function mfaCookie(production: boolean): CookieSpec {
  return {
    name: production ? "__Host-ajo_mfa" : "ajo_mfa",
    options: {
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      path: "/",
      maxAge: MFA_TTL_SECONDS,
    },
  };
}
