import { callApi, type ApiResult } from "./api-client";
import { readCookie, serializeCookie } from "./cookies";
import type { Deps } from "./auth-handlers";
import { normalizeUsername, USERNAME_PATTERN } from "@/lib/username";
import { clientOf } from "./client-context";
import { isSameOrigin } from "./same-origin";
import { openSeal, seal, SESSION_TTL_SECONDS, sessionCookie, type Session } from "./session";

export const json = (status: number, body: unknown, cookies: string[] = []) => {
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
};

type ApiRequest = Readonly<{
  path: string;
  method: "GET" | "PUT" | "POST" | "DELETE";
  body?: object;
  headers?: Readonly<Record<string, string>>;
}>;

/**
 * A 401 that carries a `code` is the API refusing an answer (a wrong password or code), not saying the
 * access token has expired. Refreshing and then clearing the session over a typo would sign the
 * person out, so these pass straight through.
 */
const isExpiredToken = (result: ApiResult) =>
  result.status === 401 && typeof result.data.code !== "string";

/**
 * Calls the API as the signed-in person. An expired access token is swapped once through the
 * refresh token (which rotates, so the new pair is stored in the cookie straight away); if the
 * refresh is refused the session is cleared and the caller sees 401.
 */
export async function withSession(
  request: Request,
  { env, fetchFn }: Deps,
  call: ApiRequest,
): Promise<Response> {
  const cookie = sessionCookie(env.production);
  const session = await openSeal<Session>(readCookie(request, cookie.name), env.sessionSecret);
  const expire = serializeCookie(cookie.name, "", { ...cookie.options, maxAge: 0 });
  if (!session) return json(401, { message: "Please sign in." });

  let result: ApiResult = await callApi(env, fetchFn, {
    client: clientOf(request),
    ...call,
    accessToken: session.accessToken,
  });
  const cookies: string[] = [];
  if (isExpiredToken(result)) {
    const refreshed = await callApi(env, fetchFn, {
      client: clientOf(request),
      path: "/auth/refresh",
      body: { refreshToken: session.refreshToken },
    });
    const { accessToken, refreshToken } = refreshed.data;
    if (
      refreshed.status !== 200 ||
      typeof accessToken !== "string" ||
      typeof refreshToken !== "string"
    ) {
      return json(401, { message: "Please sign in again." }, [expire]);
    }
    const sealed = await seal(
      { accessToken, refreshToken } satisfies Session,
      env.sessionSecret,
      SESSION_TTL_SECONDS,
    );
    cookies.push(serializeCookie(cookie.name, sealed, cookie.options));
    result = await callApi(env, fetchFn, { ...call, accessToken, client: clientOf(request) });
    if (isExpiredToken(result)) {
      return json(401, { message: "Please sign in again." }, [expire]);
    }
  }
  return json(result.status, result.data, cookies);
}

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

const pick = (body: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => k in body).map((k) => [k, body[k]]));

export async function forward(
  request: Request,
  deps: Deps,
  path: string,
  method: "PUT" | "POST" | "DELETE",
  keys: string[],
) {
  if (!isSameOrigin(request))
    return json(403, { message: "This request didn't come from the Àjọ app." });
  const body = await readObject(request);
  if (!body) return json(400, { message: "Send the form as JSON." });
  return withSession(request, deps, { path, method, body: pick(body, keys) });
}

export const handleMe = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/me", method: "GET" });
export const handleUpdateProfile = (request: Request, deps: Deps) =>
  forward(request, deps, "/me/profile", "PUT", ["country", "goal"]);
export const handleSetPin = (request: Request, deps: Deps) =>
  forward(request, deps, "/me/pin", "PUT", ["pin"]);
export const handleSetUsername = (request: Request, deps: Deps) =>
  forward(request, deps, "/me/username", "PUT", ["username"]);

/** The live check while typing. Only a well-formed, tidied name ever reaches the API. */
export function handleUsernameAvailable(request: Request, deps: Deps): Promise<Response> {
  const username = normalizeUsername(new URL(request.url).searchParams.get("username") ?? "");
  if (!USERNAME_PATTERN.test(username)) {
    return Promise.resolve(json(400, { message: "That isn't a possible username." }));
  }
  return withSession(request, deps, {
    path: `/me/username/available?username=${username}`,
    method: "GET",
  });
}
