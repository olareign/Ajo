import { callApi, UNEXPECTED, type ApiResult, type Fetch } from "./api-client";
import { clientOf } from "./client-context";
import { readCookie, serializeCookie } from "./cookies";
import type { ServerEnv } from "./env";
import { isSameOrigin } from "./same-origin";
import { openSeal, seal, SESSION_MAX_SECONDS, sessionCookie, type Session } from "./session";

export type Deps = Readonly<{ env: ServerEnv; fetchFn: Fetch }>;

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const NUMBER = /^\d{1,18}$/;
const TEXT = (max: number) => (v: string) => v.length >= 1 && v.length <= max;
const ACTION = /^[a-z_.:]{1,40}$/;

type Route = Readonly<{
  method: "GET" | "POST";
  /** The path after /api/a/, matched whole. */
  pattern: RegExp;
  /** The API path, built from the captures. */
  api: (m: RegExpMatchArray) => string;
  /** Body fields passed on; anything else the browser sends is dropped. */
  keys?: readonly string[];
  /** Query fields passed on, each with a check; anything else is dropped. */
  query?: Readonly<Record<string, (value: string) => boolean>>;
  /** No staff session needed (sign-in and joining). */
  open?: "login" | "join" | "setup-start";
}>;

/**
 * Every route the console can reach, spelled out: the browser names a path in this table, never an
 * API path of its own, and each route passes on only its own fields. A path that is not here is a 404.
 */
const ROUTES: readonly Route[] = [
  {
    method: "POST",
    pattern: /^auth\/login$/,
    api: () => "/admin/auth/login",
    keys: ["email", "password", "code"],
    open: "login",
  },
  {
    method: "POST",
    pattern: /^auth\/setup\/start$/,
    api: () => "/admin/auth/setup/start",
    keys: ["email", "setupCode", "password"],
    open: "setup-start",
  },
  {
    method: "POST",
    pattern: /^auth\/setup\/confirm$/,
    api: () => "/admin/auth/setup/confirm",
    keys: ["email", "setupCode", "code"],
    open: "join",
  },
  { method: "POST", pattern: /^auth\/logout$/, api: () => "/admin/auth/logout" },
  { method: "GET", pattern: /^me$/, api: () => "/admin/me" },
  { method: "GET", pattern: /^overview$/, api: () => "/admin/overview" },
  {
    method: "GET",
    pattern: /^users\/search$/,
    api: () => "/admin/users/search",
    query: { q: TEXT(254) },
  },
  { method: "GET", pattern: new RegExp(`^users/(${UUID})$`), api: (m) => `/admin/users/${m[1]}` },
  {
    method: "POST",
    pattern: new RegExp(`^users/(${UUID})/(suspend|reinstate)$`),
    api: (m) => `/admin/users/${m[1]}/${m[2]}`,
    keys: ["code", "reason"],
  },
  { method: "GET", pattern: /^kyc$/, api: () => "/admin/kyc" },
  { method: "GET", pattern: new RegExp(`^kyc/(${UUID})$`), api: (m) => `/admin/kyc/${m[1]}` },
  {
    method: "POST",
    pattern: new RegExp(`^kyc/(${UUID})/steps/([a-z_]{2,20})$`),
    api: (m) => `/admin/kyc/${m[1]}/steps/${m[2]}`,
    keys: ["code", "reason", "decision"],
  },
  {
    method: "POST",
    pattern: new RegExp(`^kyc/(${UUID})/override$`),
    api: (m) => `/admin/kyc/${m[1]}/override`,
    keys: ["code", "reason", "action"],
  },
  {
    method: "GET",
    pattern: /^cases$/,
    api: () => "/admin/cases",
    query: { status: (v) => ["open", "resolved", "written_off"].includes(v) },
  },
  { method: "GET", pattern: new RegExp(`^cases/(${UUID})$`), api: (m) => `/admin/cases/${m[1]}` },
  {
    method: "POST",
    pattern: new RegExp(`^cases/(${UUID})/notes$`),
    api: (m) => `/admin/cases/${m[1]}/notes`,
    keys: ["note"],
  },
  {
    method: "POST",
    pattern: new RegExp(`^cases/(${UUID})/close$`),
    api: (m) => `/admin/cases/${m[1]}/close`,
    keys: ["code", "reason", "outcome"],
  },
  {
    method: "GET",
    pattern: /^audit$/,
    api: () => "/admin/audit",
    query: {
      admin: TEXT(254),
      action: (v) => ACTION.test(v),
      target: TEXT(80),
      before: (v) => NUMBER.test(v),
    },
  },
  { method: "GET", pattern: /^team$/, api: () => "/admin/team" },
  {
    method: "POST",
    pattern: /^team$/,
    api: () => "/admin/team",
    keys: ["email", "name", "role", "code"],
  },
  {
    method: "POST",
    pattern: new RegExp(`^team/(${UUID})/(reissue|disable)$`),
    api: (m) => `/admin/team/${m[1]}/${m[2]}`,
    keys: ["code"],
  },
];

const json = (status: number, body: unknown, cookies: string[] = []) => {
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
};
const notFound = () => json(404, { message: "Not found." });
const NOT_US = { message: "This request didn't come from the console." };

async function readObject(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > 10_000) return null;
  try {
    const value: unknown = text === "" ? {} : JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const bodyOf = (data: unknown): Record<string, unknown> =>
  data && typeof data === "object" ? (data as Record<string, unknown>) : {};

/** What the browser is told about a failure: the API's own words and code, nothing else. */
const said = (result: ApiResult) => {
  const body = bodyOf(result.data);
  const message = Array.isArray(body.message)
    ? "Check what you entered and try again."
    : body.message;
  return {
    ...(typeof message === "string" ? { message } : {}),
    ...(typeof body.code === "string" ? { code: body.code } : {}),
    ...(body.details && typeof body.details === "object" ? { details: body.details } : {}),
  };
};

export async function handleAdmin(
  request: Request,
  { env, fetchFn }: Deps,
  path: readonly string[],
): Promise<Response> {
  const rel = path.join("/");
  const method = request.method === "GET" ? "GET" : request.method === "POST" ? "POST" : null;
  if (!method) return notFound();
  let match: RegExpMatchArray | null = null;
  const route = ROUTES.find((r) => r.method === method && (match = rel.match(r.pattern)) !== null);
  if (!route || !match) return notFound();
  // Everything that changes something, and every sign-in step, comes from the console's own pages.
  if (method === "POST" && !isSameOrigin(request)) return json(403, NOT_US);

  const cookie = sessionCookie(env.production);
  const expire = serializeCookie(cookie.name, "", { ...cookie.options, maxAge: 0 });
  const client = clientOf(request);

  let body: Record<string, unknown> | undefined;
  if (route.keys) {
    const sent = await readObject(request);
    if (!sent) return json(400, { message: "Send the form as JSON." });
    body = Object.fromEntries(route.keys.filter((k) => k in sent).map((k) => [k, sent[k]]));
  }
  let suffix = "";
  if (route.query) {
    const params = new URL(request.url).searchParams;
    const keep = new URLSearchParams();
    for (const [key, check] of Object.entries(route.query)) {
      const value = params.get(key);
      if (value === null || value === "") continue;
      if (!check(value)) return json(400, { message: `That ${key} isn't allowed.` });
      keep.set(key, value);
    }
    suffix = keep.size > 0 ? `?${keep}` : "";
  }

  if (route.open) {
    const result = await callApi(env, fetchFn, {
      path: `${route.api(match)}${suffix}`,
      method,
      body,
      client,
    });
    const data = bodyOf(result.data);
    if (result.status !== 200 || (route.open !== "setup-start" && typeof data.token !== "string")) {
      return json(result.status === 200 ? 502 : result.status, said(result));
    }
    if (route.open === "setup-start") {
      if (typeof data.secret !== "string" || typeof data.otpauthUri !== "string") {
        return json(502, { message: UNEXPECTED, code: "unexpected_answer" });
      }
      return json(200, { secret: data.secret, otpauthUri: data.otpauthUri });
    }
    // A session starts: the token is sealed into a cookie only the server can open, and never sent to the browser.
    const expiresAt = typeof data.expiresAt === "string" ? Date.parse(data.expiresAt) : NaN;
    const remaining = Math.floor((expiresAt - Date.now()) / 1000);
    const ttl = Math.max(
      60,
      Math.min(SESSION_MAX_SECONDS, Number.isFinite(remaining) ? remaining : SESSION_MAX_SECONDS),
    );
    const sealed = await seal(
      { token: String(data.token) } satisfies Session,
      env.sessionSecret,
      ttl,
    );
    const set = serializeCookie(cookie.name, sealed, { ...cookie.options, maxAge: ttl });
    return json(200, { admin: data.admin }, [set]);
  }

  const session = await openSeal<Session>(readCookie(request, cookie.name), env.sessionSecret);
  if (!session || typeof session.token !== "string")
    return json(401, { message: "Please sign in." });
  const result = await callApi(env, fetchFn, {
    path: `${route.api(match)}${suffix}`,
    method,
    body,
    token: session.token,
    client,
  });
  if (route.pattern.source === /^auth\/logout$/.source) return json(204, null, [expire]);
  // The API says the session has ended (or never was): clear ours too.
  if (result.status === 401 && typeof bodyOf(result.data).code !== "string") {
    return json(401, { message: "Please sign in again." }, [expire]);
  }
  if (result.status === 204) return json(204, null);
  return json(result.status, result.status >= 400 ? said(result) : result.data);
}
