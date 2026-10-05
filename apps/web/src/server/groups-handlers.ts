import type { Deps } from "./auth-handlers";
import { proxy, UUID } from "./api-proxy";
import { json, withSession } from "./me-handlers";

const CODE = /^[A-Za-z0-9]{8}$/;
const GROUP_FIELDS = [
  "name",
  "community",
  "contribution",
  "frequency",
  "size",
  "startDate",
  "orderMethod",
  "visibility",
];
const notFound = () => Promise.resolve(json(404, { message: "We couldn't find that circle." }));

const get = (path: string) => (request: Request, deps: Deps) =>
  withSession(request, deps, { path, method: "GET" });

export const handleGroups = get("/groups");
export const handleDiscover = get("/groups/discover");

export const handleGroupPreview = (request: Request, deps: Deps) =>
  proxy(request, deps, "/groups/preview", "POST", { keys: GROUP_FIELDS });

export const handleCreateGroup = (request: Request, deps: Deps) =>
  proxy(request, deps, "/groups", "POST", { keys: GROUP_FIELDS, idempotent: true });

export const handleJoinByCode = (request: Request, deps: Deps) =>
  proxy(request, deps, "/groups/join", "POST", { keys: ["code"] });

/** A circle by its invite code; only a well-formed code is put in the API's address. */
export function handleGroupByCode(request: Request, deps: Deps, code: string): Promise<Response> {
  if (!CODE.test(code)) return Promise.resolve(json(404, { message: "That invite isn't valid." }));
  return withSession(request, deps, { path: `/groups/code/${code.toUpperCase()}`, method: "GET" });
}

export function handleGroup(request: Request, deps: Deps, id: string): Promise<Response> {
  if (!UUID.test(id)) return notFound();
  return withSession(request, deps, { path: `/groups/${id}`, method: "GET" });
}

const ACTIONS = {
  join: { keys: undefined },
  leave: { keys: undefined },
  cancel: { keys: undefined },
  invite: { keys: ["username"] },
  pick: { keys: ["spot"] },
} as const;

export type GroupAction = keyof typeof ACTIONS;
export const isGroupAction = (value: string): value is GroupAction => Object.hasOwn(ACTIONS, value);

export function handleGroupAction(
  request: Request,
  deps: Deps,
  id: string,
  action: GroupAction,
): Promise<Response> {
  if (!UUID.test(id)) return notFound();
  const { keys } = ACTIONS[action];
  return proxy(request, deps, `/groups/${id}/${action}`, "POST", keys ? { keys: [...keys] } : {});
}

// ---- trading turns ------------------------------------------------------------------------------

export function handleSwaps(request: Request, deps: Deps, id: string): Promise<Response> {
  if (!UUID.test(id)) return notFound();
  return withSession(request, deps, { path: `/groups/${id}/swaps`, method: "GET" });
}

export function handleProposeSwap(request: Request, deps: Deps, id: string): Promise<Response> {
  if (!UUID.test(id)) return notFound();
  return proxy(request, deps, `/groups/${id}/swaps`, "POST", { keys: ["username"] });
}

export function handleAnswerSwap(
  request: Request,
  deps: Deps,
  id: string,
  swapId: string,
): Promise<Response> {
  if (!UUID.test(id) || !UUID.test(swapId)) return notFound();
  return proxy(request, deps, `/groups/${id}/swaps/${swapId}/answer`, "POST", { keys: ["accept"] });
}
