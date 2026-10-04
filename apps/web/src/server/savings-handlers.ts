import type { Deps } from "./auth-handlers";
import { proxy, UUID } from "./api-proxy";
import { json, withSession } from "./me-handlers";

const PLAN_FIELDS = ["name", "amount", "frequency", "totalDebits", "startDate", "topupFromBank"];
const notFound = () => Promise.resolve(json(404, { message: "We couldn't find that plan." }));

export const handleSavingsList = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/savings", method: "GET" });

export const handleSavingsPreview = (request: Request, deps: Deps) =>
  proxy(request, deps, "/savings/preview", "POST", { keys: PLAN_FIELDS });

export const handleCreatePlan = (request: Request, deps: Deps) =>
  proxy(request, deps, "/savings", "POST", { keys: PLAN_FIELDS, idempotent: true });

/** One of the person's own plans. Only a well-formed id is ever put into the API's address. */
export function handlePlan(request: Request, deps: Deps, id: string): Promise<Response> {
  if (!UUID.test(id)) return notFound();
  return withSession(request, deps, { path: `/savings/${id}`, method: "GET" });
}

const ACTIONS = {
  pause: { keys: undefined, idempotent: false },
  resume: { keys: undefined, idempotent: false },
  topup: { keys: ["amount"], idempotent: true },
  withdraw: { keys: ["pin"], idempotent: false },
} as const;

export type PlanAction = keyof typeof ACTIONS;
export const isPlanAction = (value: string): value is PlanAction => Object.hasOwn(ACTIONS, value);

export function handlePlanAction(
  request: Request,
  deps: Deps,
  id: string,
  action: PlanAction,
): Promise<Response> {
  if (!UUID.test(id)) return notFound();
  const { keys, idempotent } = ACTIONS[action];
  return proxy(request, deps, `/savings/${id}/${action}`, "POST", {
    ...(keys ? { keys: [...keys] } : {}),
    idempotent,
  });
}
