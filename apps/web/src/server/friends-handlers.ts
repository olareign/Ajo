import { callApi } from "./api-client";
import { proxy } from "./api-proxy";
import type { Deps } from "./auth-handlers";
import { clientOf } from "./client-context";
import { json, withSession } from "./me-handlers";

const USERNAME = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const INVITE = /^[A-Za-z0-9]{8}$/;
const notFound = () => Promise.resolve(json(404, { message: "We couldn't find that person." }));

const get = (path: string) => (request: Request, deps: Deps) =>
  withSession(request, deps, { path, method: "GET" });

export const handleFriends = get("/friends");
export const handleFriendRequests = get("/friends/requests");
export const handleSuggestions = get("/friends/suggestions");
export const handleMyInvite = get("/friends/invite");
export const handleBlocks = get("/friends/blocks");

/** The start of a username, tidied. Only a well-formed one reaches the API's address. */
export function handleSearch(request: Request, deps: Deps): Promise<Response> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().replace(/^@/, "");
  if (q.length < 3 || !USERNAME.test(q)) {
    return Promise.resolve(json(400, { message: "Type at least 3 letters of their username." }));
  }
  return withSession(request, deps, {
    path: `/friends/search?q=${encodeURIComponent(q)}`,
    method: "GET",
  });
}

export function handlePerson(request: Request, deps: Deps, username: string): Promise<Response> {
  if (!USERNAME.test(username)) return notFound();
  return withSession(request, deps, { path: `/friends/people/${username}`, method: "GET" });
}

export const handleSendRequest = (request: Request, deps: Deps) =>
  proxy(request, deps, "/friends/requests", "POST", { keys: ["username"] });

export const handleBlock = (request: Request, deps: Deps) =>
  proxy(request, deps, "/friends/blocks", "POST", { keys: ["username"] });

export const handleReport = (request: Request, deps: Deps) =>
  proxy(request, deps, "/friends/reports", "POST", { keys: ["username", "reason", "details"] });

const ACTIONS = {
  accept: { path: (u: string) => `/friends/requests/${u}/accept`, method: "POST" },
  decline: { path: (u: string) => `/friends/requests/${u}/received`, method: "DELETE" },
  cancel: { path: (u: string) => `/friends/requests/${u}`, method: "DELETE" },
  remove: { path: (u: string) => `/friends/${u}`, method: "DELETE" },
  unblock: { path: (u: string) => `/friends/blocks/${u}`, method: "DELETE" },
} as const;

export type PersonAction = keyof typeof ACTIONS;
export const isPersonAction = (value: string): value is PersonAction =>
  Object.hasOwn(ACTIONS, value);

/** One of the actions on a person, by their username; only a well-formed username is ever put in an address. */
export function handlePersonAction(
  request: Request,
  deps: Deps,
  username: string,
  action: PersonAction,
): Promise<Response> {
  if (!USERNAME.test(username)) return notFound();
  const { path, method } = ACTIONS[action];
  return proxy(request, deps, path(username.toLowerCase()), method, {});
}

/**
 * Who an invite link is from. Needs no sign-in (the person opening it has no account yet), so it goes
 * to the API as a plain call with only the well-formed code in its address.
 */
export async function handleInvite(
  request: Request,
  { env, fetchFn }: Deps,
  code: string,
): Promise<Response> {
  if (!INVITE.test(code)) return json(404, { message: "That invite isn't valid." });
  const result = await callApi(env, fetchFn, {
    client: clientOf(request),
    path: `/invites/${code}`,
    method: "GET",
  });
  return json(result.status, result.data);
}
