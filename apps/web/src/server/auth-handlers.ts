import { callApi, type Fetch } from "./api-client";
import { readCookie, serializeCookie } from "./cookies";
import type { ServerEnv } from "./env";
import { clientOf } from "./client-context";
import { withSession } from "./me-handlers";
import { isSameOrigin } from "./same-origin";
import {
  deviceCookie,
  isDeviceToken,
  MFA_TTL_SECONDS,
  mfaCookie,
  openSeal,
  seal,
  SESSION_TTL_SECONDS,
  sessionCookie,
  type MfaChallenge,
  type Session,
} from "./session";

export type Deps = Readonly<{ env: ServerEnv; fetchFn: Fetch }>;

const json = (status: number, body: unknown, cookies: string[] = []) => {
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
};

const FORBIDDEN = () => json(403, { message: "This request didn't come from the Àjọ app." });

async function readObject(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > 10_000) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Copies only the named fields, so nothing unexpected reaches the API. */
function pick(body: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((k) => k in body).map((k) => [k, body[k]]));
}

export async function handleSignUp(request: Request, { env, fetchFn }: Deps): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const body = await readObject(request);
  if (!body) return json(400, { message: "Send the form as JSON." });
  const result = await callApi(env, fetchFn, {
    client: clientOf(request),
    path: "/auth/sign-up",
    patient: true,
    body: pick(body, ["email", "password", "displayName", "botToken", "invite"]),
  });
  return json(result.status, result.data);
}

export async function handleVerifyEmail(
  request: Request,
  { env, fetchFn }: Deps,
): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const body = await readObject(request);
  if (!body) return json(400, { message: "Send the form as JSON." });
  const result = await callApi(env, fetchFn, {
    client: clientOf(request),
    path: "/auth/email/verify",
    patient: true,
    body: pick(body, ["token"]),
  });
  return json(result.status, result.data);
}

/** Asks for a new confirmation link. The API answers the same whether or not the address has an account. */
export async function handleResendVerification(
  request: Request,
  { env, fetchFn }: Deps,
): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const body = await readObject(request);
  if (!body) return json(400, { message: "Send the form as JSON." });
  const result = await callApi(env, fetchFn, {
    client: clientOf(request),
    path: "/auth/email/resend",
    patient: true,
    body: pick(body, ["email"]),
  });
  return json(result.status, result.data);
}

export async function handleForgotPassword(
  request: Request,
  { env, fetchFn }: Deps,
): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const body = await readObject(request);
  if (!body) return json(400, { message: "Send the form as JSON." });
  const result = await callApi(env, fetchFn, {
    client: clientOf(request),
    path: "/auth/password/forgot",
    patient: true,
    body: pick(body, ["email"]),
  });
  return json(result.status, result.data);
}

/** Changing a password never signs anyone in; the person signs in again with the new one. */
export async function handleResetPassword(
  request: Request,
  { env, fetchFn }: Deps,
): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const body = await readObject(request);
  if (!body) return json(400, { message: "Send the form as JSON." });
  const result = await callApi(env, fetchFn, {
    client: clientOf(request),
    path: "/auth/password/reset",
    patient: true,
    body: pick(body, ["token", "password"]),
  });
  return json(result.status, result.data);
}

export async function handleSignIn(request: Request, { env, fetchFn }: Deps): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const body = await readObject(request);
  if (!body) return json(400, { message: "Send the form as JSON." });
  // A device the person asked to be remembered on carries a secret; with it the API skips the code.
  const device = readCookie(request, deviceCookie(env.production).name);
  const result = await callApi(env, fetchFn, {
    client: clientOf(request),
    path: "/auth/login",
    patient: true,
    body: {
      ...pick(body, ["email", "password"]),
      ...(isDeviceToken(device) ? { deviceToken: device } : {}),
    },
  });

  if (result.status !== 200) return json(result.status, result.data);

  if (result.data.mfaRequired === true && typeof result.data.mfaToken === "string") {
    const cookie = mfaCookie(env.production);
    const sealed = await seal(
      { mfaToken: result.data.mfaToken },
      env.sessionSecret,
      MFA_TTL_SECONDS,
    );
    return json(200, { mfaRequired: true }, [serializeCookie(cookie.name, sealed, cookie.options)]);
  }
  return startSession(env, result.data);
}

/** Second step of a sign-in that needs a code: the challenge lives in a short-lived sealed cookie. */
export async function handleMfaSignIn(request: Request, { env, fetchFn }: Deps): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const body = await readObject(request);
  if (!body) return json(400, { message: "Send the form as JSON." });
  const cookie = mfaCookie(env.production);
  const challenge = await openSeal<MfaChallenge>(
    readCookie(request, cookie.name),
    env.sessionSecret,
  );
  if (!challenge) return json(401, { message: "That sign-in took too long. Please start again." });
  const result = await callApi(env, fetchFn, {
    client: clientOf(request),
    path: "/auth/login/mfa",
    patient: true,
    body: {
      mfaToken: challenge.mfaToken,
      ...pick(body, ["code", "recoveryCode"]),
      ...(typeof body.trustDevice === "boolean" ? { trustDevice: body.trustDevice } : {}),
    },
  });
  if (result.status !== 200) return json(result.status, result.data);
  return startSession(env, result.data);
}

/** Seals the API's tokens into the session cookie; the body says only that it worked. */
export async function startSession(
  env: ServerEnv,
  data: Record<string, unknown>,
): Promise<Response> {
  if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
    return json(502, { message: "Sign-in did not complete. Please try again." });
  }
  const session: Session = { accessToken: data.accessToken, refreshToken: data.refreshToken };
  const cookie = sessionCookie(env.production);
  const sealed = await seal(session, env.sessionSecret, SESSION_TTL_SECONDS);
  const clearMfa = mfaCookie(env.production);
  const device = deviceCookie(env.production);
  return json(200, { signedIn: true }, [
    serializeCookie(cookie.name, sealed, cookie.options),
    serializeCookie(clearMfa.name, "", { ...clearMfa.options, maxAge: 0 }),
    // The device's secret goes into its own cookie, never into the page's data.
    ...(isDeviceToken(data.deviceToken)
      ? [serializeCookie(device.name, data.deviceToken, device.options)]
      : []),
  ]);
}

export async function handleSignOut(request: Request, { env, fetchFn }: Deps): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const cookie = sessionCookie(env.production);
  const session = await openSeal<Session>(readCookie(request, cookie.name), env.sessionSecret);
  if (session) {
    await callApi(env, fetchFn, {
      path: "/auth/logout",
      accessToken: session.accessToken,
      client: clientOf(request),
    });
  }
  return json(204, null, [serializeCookie(cookie.name, "", { ...cookie.options, maxAge: 0 })]);
}

/**
 * Ends every session the person has, on every device, then this one's cookie. It goes through the
 * same refresh-aware call as the rest of the signed-in API: an access token that has simply expired
 * (the usual state after a quarter of an hour) must not be mistaken for "already signed out", or the
 * other devices would stay signed in while this one claimed success. If the API cannot be reached the
 * person stays signed in here and is told, so they can try again.
 */
export async function handleSignOutAll(request: Request, deps: Deps): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const cookie = sessionCookie(deps.env.production);
  if (!readCookie(request, cookie.name)) return json(401, { message: "Please sign in." });

  const result = await withSession(request, deps, { path: "/auth/logout-all", method: "POST" });
  // Done, or the session was already gone: either way this device is signed out now.
  if (result.status < 300 || result.status === 401) {
    return json(204, null, [serializeCookie(cookie.name, "", { ...cookie.options, maxAge: 0 })]);
  }
  return result;
}
