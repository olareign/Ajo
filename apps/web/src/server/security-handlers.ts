import { proxy, UUID } from "./api-proxy";
import type { Deps } from "./auth-handlers";
import { json, withSession } from "./me-handlers";

/**
 * The account security routes, by a fixed table: the browser names an action, never an API path, and
 * each change passes on only its own fields. Changes come from this app only (proxy checks the origin).
 */
const READS = {
  sessions: "/me/security/sessions",
  "trusted-devices": "/me/security/trusted-devices",
  events: "/me/security/events",
} as const;

const CHANGES = {
  password: { path: "/me/security/password", keys: ["currentPassword", "newPassword", "code"] },
  pin: { path: "/me/security/pin", keys: ["currentPin", "newPin"] },
  "pin/reset": { path: "/me/security/pin/reset", keys: ["password", "code", "newPin"] },
  "recovery-codes": { path: "/me/security/recovery-codes", keys: ["password", "code"] },
  close: { path: "/me/security/close", keys: ["password", "code"] },
} as const;

const REMOVABLE = new Set(["sessions", "trusted-devices"]);
const notFound = () => Promise.resolve(json(404, { message: "Not found." }));

export function handleSecurityGet(request: Request, deps: Deps, path: string[]): Promise<Response> {
  const name = path.join("/");
  if (!Object.hasOwn(READS, name)) return notFound();
  return withSession(request, deps, { path: READS[name as keyof typeof READS], method: "GET" });
}

export function handleSecurityPost(
  request: Request,
  deps: Deps,
  path: string[],
): Promise<Response> {
  const name = path.join("/");
  if (!Object.hasOwn(CHANGES, name)) return notFound();
  const change = CHANGES[name as keyof typeof CHANGES];
  return proxy(request, deps, change.path, "POST", { keys: [...change.keys] });
}

/** Signing a device out, or forgetting a remembered one: only a well-formed id reaches the API. */
export function handleSecurityDelete(
  request: Request,
  deps: Deps,
  path: string[],
): Promise<Response> {
  const [kind, id, ...rest] = path;
  if (!kind || !REMOVABLE.has(kind) || !id || !UUID.test(id) || rest.length > 0) return notFound();
  return proxy(request, deps, `/me/security/${kind}/${id}`, "DELETE", {});
}
