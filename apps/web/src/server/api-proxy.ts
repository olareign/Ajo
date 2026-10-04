import type { Deps } from "./auth-handlers";
import { json, withSession } from "./me-handlers";
import { isSameOrigin } from "./same-origin";

const NOT_US = { message: "This request didn't come from the Àjọ app." };
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_\-:.]{8,100}$/;
const MFA_CODE = /^\d{6}$/;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Method = "POST" | "PUT" | "DELETE";

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
export async function proxy(
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
