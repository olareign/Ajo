import type { Deps } from "./auth-handlers";
import { proxy, UUID } from "./api-proxy";
import { json, withSession } from "./me-handlers";

const money = proxy;

export const handleFund = (request: Request, deps: Deps) =>
  money(request, deps, "/payments/fund", "POST", { keys: ["amount", "method"], idempotent: true });

export const handleWithdraw = (request: Request, deps: Deps) =>
  money(request, deps, "/payments/withdraw", "POST", {
    keys: ["amount", "pin"],
    idempotent: true,
    code: true,
  });

export const handleSetPayoutAccount = (request: Request, deps: Deps) =>
  money(request, deps, "/payments/payout-account", "PUT", {
    keys: ["bankCode", "accountNumber"],
    code: true,
  });

export const handleCreateMandate = (request: Request, deps: Deps) =>
  money(request, deps, "/payments/mandate", "POST", {});

export const handleCancelMandate = (request: Request, deps: Deps) =>
  money(request, deps, "/payments/mandate", "DELETE", {});

export const handlePayoutAccount = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/payments/payout-account", method: "GET" });

export const handleMandate = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/payments/mandate", method: "GET" });

export const handleBanks = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/payments/banks", method: "GET" });

/** One of the person's own payments. Only a well-formed id is ever put into the API's address. */
export function handlePayment(request: Request, deps: Deps, id: string): Promise<Response> {
  if (!UUID.test(id)) return Promise.resolve(json(404, { message: "We couldn't find that." }));
  return withSession(request, deps, { path: `/payments/${id}`, method: "GET" });
}
