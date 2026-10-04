import type { Deps } from "./auth-handlers";
import { proxy, UUID } from "./api-proxy";
import { json, withSession } from "./me-handlers";

/** One page of the person's messages. Only the two parameters the API knows reach it, and only if well formed. */
export function handleNotifications(request: Request, deps: Deps): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  const limit = params.get("limit");
  if (limit !== null) {
    if (!/^\d{1,3}$/.test(limit) || Number(limit) < 1 || Number(limit) > 50) {
      return Promise.resolve(json(400, { message: "That page size isn't allowed." }));
    }
    query.set("limit", limit);
  }
  const before = params.get("before");
  if (before !== null) {
    if (!/^\d{1,20}$/.test(before)) {
      return Promise.resolve(json(400, { message: "That place in the list isn't valid." }));
    }
    query.set("before", before);
  }
  const suffix = query.size > 0 ? `?${query}` : "";
  return withSession(request, deps, { path: `/notifications${suffix}`, method: "GET" });
}

export const handleReadAll = (request: Request, deps: Deps) =>
  proxy(request, deps, "/notifications/read-all", "POST", {});

export function handleRead(request: Request, deps: Deps, id: string): Promise<Response> {
  if (!UUID.test(id)) return Promise.resolve(json(404, { message: "We couldn't find that." }));
  return proxy(request, deps, `/notifications/${id}/read`, "POST", {});
}
