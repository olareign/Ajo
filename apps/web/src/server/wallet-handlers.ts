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

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** A statement for a date range. Only two well-formed dates reach the API, which checks the range. */
export function handleStatement(request: Request, deps: Deps): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!DAY.test(from) || !DAY.test(to)) {
    return Promise.resolve(json(400, { message: "Choose a first and last day." }));
  }
  return withSession(request, deps, {
    path: `/wallet/statement?${new URLSearchParams({ from, to })}`,
    method: "GET",
  });
}

/** Month-by-month figures; only a small whole number of months reaches the API. */
export function handleInsights(request: Request, deps: Deps): Promise<Response> {
  const months = new URL(request.url).searchParams.get("months") ?? "12";
  if (!/^\d{1,2}$/.test(months) || Number(months) < 1 || Number(months) > 24) {
    return Promise.resolve(json(400, { message: "That many months isn't allowed." }));
  }
  return withSession(request, deps, { path: `/wallet/insights?months=${months}`, method: "GET" });
}
