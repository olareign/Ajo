import { callApi, type ApiResult } from "./api-client";
import { readCookie, serializeCookie } from "./cookies";
import type { Deps } from "./auth-handlers";
import { clientOf } from "./client-context";
import { json } from "./me-handlers";
import { openSeal, seal, SESSION_TTL_SECONDS, sessionCookie, type Session } from "./session";

/**
 * What each main screen needs, fetched together. The paths are fixed here: the browser only names a
 * screen, so it can never steer this server to another API path.
 */
export const SCREENS = {
  today: {
    wallets: "/wallet",
    plans: "/savings",
    notices: "/notifications?limit=1",
    friends: "/friends",
    requests: "/friends/requests",
    groups: "/groups",
  },
  wallet: { wallets: "/wallet", transactions: "/wallet/transactions?limit=20" },
  friends: {
    friends: "/friends",
    requests: "/friends/requests",
    suggestions: "/friends/suggestions",
  },
} as const satisfies Record<string, Record<string, string>>;

export type ScreenName = keyof typeof SCREENS;
export const isScreen = (name: string): name is ScreenName => Object.hasOwn(SCREENS, name);

const isExpiredToken = (result: ApiResult) =>
  result.status === 401 && typeof result.data.code !== "string";

/**
 * Asks the API for every part of a screen at once, as the signed-in person. If the access token has
 * expired the session is refreshed once (not once per part) and only the parts that were turned away
 * are asked again. Each part keeps its own answer, so one refused part (say, savings before the
 * passport is approved) does not hide the others.
 */
export async function handleScreen(request: Request, deps: Deps, name: string): Promise<Response> {
  if (!isScreen(name)) return json(404, { message: "There's no such screen." });
  const { env, fetchFn } = deps;
  const cookie = sessionCookie(env.production);
  const session = await openSeal<Session>(readCookie(request, cookie.name), env.sessionSecret);
  const expire = serializeCookie(cookie.name, "", { ...cookie.options, maxAge: 0 });
  if (!session) return json(401, { message: "Please sign in." });

  const parts = Object.entries(SCREENS[name]) as [string, string][];
  const ask = (path: string, accessToken: string) =>
    callApi(env, fetchFn, { client: clientOf(request), path, method: "GET", accessToken });

  let results = await Promise.all(parts.map(([, path]) => ask(path, session.accessToken)));
  const cookies: string[] = [];
  if (results.some(isExpiredToken)) {
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
    results = await Promise.all(
      results.map((result, i) =>
        isExpiredToken(result) ? ask(parts[i]![1], accessToken) : result,
      ),
    );
    if (results.some(isExpiredToken))
      return json(401, { message: "Please sign in again." }, [expire]);
  }

  const body = Object.fromEntries(
    parts.map(([key], i) => [key, { status: results[i]!.status, data: results[i]!.data }]),
  );
  return json(200, body, cookies);
}
