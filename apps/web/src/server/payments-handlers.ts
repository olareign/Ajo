import type { Deps } from "./auth-handlers";
import { json, withSession } from "./me-handlers";
import { isSameOrigin } from "./same-origin";

const NOT_US = { message: "This request didn't come from the Àjọ app." };
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_\-:.]{8,100}$/;
const MFA_CODE = /^\d{6}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Method = "POST" | "PUT" | "DELETE";

async function readObject(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > 10_000) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * A money call: from this app's own pages only, with the few fields the API knows and the two
 * headers it reads. The key that makes a retry safe and the authenticator code are checked for shape
 * here and named explicitly; nothing else from the browser's headers reaches the API.
 */
async function money(
  request: Request,
  deps: Deps,
  path: string,
  method: Method,
  options: Readonly<{ keys?: string[]; idempotent?: boolean; code?: boolean }>,
): Promise<Response> {
  if (!isSameOrigin(request)) return json(403, NOT_US);
  const headers: Record<string, string> = {};
  if (options.idempotent) {
    const key = request.headers.get("idempotency-key")?.trim() ?? "";
    if (!IDEMPOTENCY_KEY.test(key)) {
      return json(400, {
        message: "This request is missing its safety key. Reload and try again.",
      });
    }
    headers["Idempotency-Key"] = key;
  }
  if (options.code) {
    const code = request.headers.get("x-ajo-mfa-code")?.trim();
    if (code !== undefined && code !== "") {
      if (!MFA_CODE.test(code)) return json(400, { message: "The code is 6 digits." });
      headers["X-Ajo-Mfa-Code"] = code;
    }
  }
  let body: Record<string, unknown> | undefined;
  if (options.keys) {
    const sent = await readObject(request);
    if (!sent) return json(400, { message: "Send the form as JSON." });
    body = Object.fromEntries(options.keys.filter((k) => k in sent).map((k) => [k, sent[k]]));
  }
  return withSession(request, deps, { path, method, body, headers });
}

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
