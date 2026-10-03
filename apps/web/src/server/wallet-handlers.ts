import type { Deps } from "./auth-handlers";
import { json, withSession } from "./me-handlers";

export const handleWallet = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/wallet", method: "GET" });

const PAGE_SIZE_MAX = 100;
const CURSOR = /^\d{1,18}$/;

/**
 * History, a page at a time. Only the two parameters the API knows are passed on, and only when
 * they are well formed; nothing else from the browser's query string reaches the API.
 */
export function handleTransactions(request: Request, deps: Deps): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams();

  const limit = params.get("limit");
  if (limit !== null) {
    if (!/^\d{1,3}$/.test(limit) || Number(limit) < 1 || Number(limit) > PAGE_SIZE_MAX) {
      return Promise.resolve(json(400, { message: "That page size isn't allowed." }));
    }
    query.set("limit", limit);
  }
  const before = params.get("before");
  if (before !== null) {
    if (!CURSOR.test(before)) {
      return Promise.resolve(json(400, { message: "That place in the history isn't valid." }));
    }
    query.set("before", before);
  }

  const suffix = query.size > 0 ? `?${query}` : "";
  return withSession(request, deps, { path: `/wallet/transactions${suffix}`, method: "GET" });
}
