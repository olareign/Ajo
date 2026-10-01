import { callApi, type Fetch } from "./api-client";
import { readCookie, serializeCookie } from "./cookies";
import type { ServerEnv } from "./env";
import { isSameOrigin } from "./same-origin";
import {
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
    path: "/auth/sign-up",
    patient: true,
    body: pick(body, ["email", "password", "displayName"]),
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
    path: "/auth/email/verify",
    patient: true,
    body: pick(body, ["token"]),
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
  const result = await callApi(env, fetchFn, {
    path: "/auth/login",
    patient: true,
    body: pick(body, ["email", "password"]),
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
    path: "/auth/login/mfa",
    patient: true,
    body: { mfaToken: challenge.mfaToken, ...pick(body, ["code", "recoveryCode"]) },
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
  return json(200, { signedIn: true }, [
    serializeCookie(cookie.name, sealed, cookie.options),
    serializeCookie(clearMfa.name, "", { ...clearMfa.options, maxAge: 0 }),
  ]);
}

export async function handleSignOut(request: Request, { env, fetchFn }: Deps): Promise<Response> {
  if (!isSameOrigin(request)) return FORBIDDEN();
  const cookie = sessionCookie(env.production);
  const session = await openSeal<Session>(readCookie(request, cookie.name), env.sessionSecret);
  if (session) {
    await callApi(env, fetchFn, { path: "/auth/logout", accessToken: session.accessToken });
  }
  return json(204, null, [serializeCookie(cookie.name, "", { ...cookie.options, maxAge: 0 })]);
}
