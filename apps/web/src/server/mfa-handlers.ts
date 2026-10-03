import type { Deps } from "./auth-handlers";
import { forward, json, withSession } from "./me-handlers";
import { isSameOrigin } from "./same-origin";

const PATH = "/auth/mfa/totp";

/** Begins setup: the API answers with the secret and the link behind the QR code. */
export function handleMfaEnrol(request: Request, deps: Deps): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Promise.resolve(json(403, { message: "This request didn't come from the Àjọ app." }));
  }
  return withSession(request, deps, { path: PATH, method: "POST" });
}

/** Proves the app works by a first code; the answer holds the recovery codes, shown once. */
export const handleMfaConfirm = (request: Request, deps: Deps) =>
  forward(request, deps, `${PATH}/confirm`, "POST", ["code"]);

/** Needs the password and a current code, so a borrowed phone cannot switch the protection off. */
export const handleMfaDisable = (request: Request, deps: Deps) =>
  forward(request, deps, PATH, "DELETE", ["password", "code"]);
