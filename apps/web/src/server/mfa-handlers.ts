import type { Deps } from "./auth-handlers";
import { serializeCookie } from "./cookies";
import { forward, json, withSession } from "./me-handlers";
import { isSameOrigin } from "./same-origin";
import { deviceCookie, isDeviceToken } from "./session";

const PATH = "/auth/mfa/totp";

/** Begins setup: the API answers with the secret and the link behind the QR code. */
export function handleMfaEnrol(request: Request, deps: Deps): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Promise.resolve(json(403, { message: "This request didn't come from the Àjọ app." }));
  }
  return withSession(request, deps, { path: PATH, method: "POST" });
}

/**
 * Proves the app works by a first code; the answer holds the recovery codes, shown once. The phone
 * that just did it is remembered by the API, and its secret goes into a cookie rather than the page.
 */
export async function handleMfaConfirm(request: Request, deps: Deps): Promise<Response> {
  const response = await forward(request, deps, `${PATH}/confirm`, "POST", ["code"]);
  if (response.status !== 200) return response;
  const { deviceToken, ...data } = (await response.json()) as Record<string, unknown>;
  const cookies = response.headers.getSetCookie();
  if (isDeviceToken(deviceToken)) {
    const device = deviceCookie(deps.env.production);
    cookies.push(serializeCookie(device.name, deviceToken, device.options));
  }
  return json(200, data, cookies);
}

/** Needs the password and a current code, so a borrowed phone cannot switch the protection off. */
export const handleMfaDisable = (request: Request, deps: Deps) =>
  forward(request, deps, PATH, "DELETE", ["password", "code"]);
