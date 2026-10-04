export type Failure =
  | Readonly<{ kind: "signed-out" }>
  | Readonly<{ kind: "unreachable"; message: string }>
  /** The API said no, and says why in words. `code` is for the screen to act on. */
  | Readonly<{ kind: "refused"; status: number; code?: string; message: string }>;

export type Outcome<T> =
  Readonly<{ ok: true; data: T }> | Readonly<{ ok: false; failure: Failure }>;

const UNREACHABLE = "We couldn't reach Àjọ. Check your connection and try again.";

export async function send<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  options: Readonly<{ body?: object; key?: string; code?: string }> = {},
): Promise<Outcome<T>> {
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (options.key) headers["Idempotency-Key"] = options.key;
  if (options.code) headers["X-Ajo-Mfa-Code"] = options.code;
  try {
    const res = await fetch(url, {
      method,
      headers,
      credentials: "same-origin",
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, data: data as T };
    // Our server's own "I couldn't reach the API": the request may or may not have got through.
    if (res.status === 502 || res.status === 504) {
      return {
        ok: false,
        failure: {
          kind: "unreachable",
          message: typeof data.message === "string" ? data.message : UNREACHABLE,
        },
      };
    }
    const code = typeof data.code === "string" ? data.code : undefined;
    // A 401 that carries a code is the API refusing a code, not an end to the session.
    if (res.status === 401 && !code) return { ok: false, failure: { kind: "signed-out" } };
    const message =
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message) && typeof data.message[0] === "string"
          ? data.message[0]
          : "Something went wrong. Nothing was moved.";
    return { ok: false, failure: { kind: "refused", status: res.status, code, message } };
  } catch {
    return { ok: false, failure: { kind: "unreachable", message: UNREACHABLE } };
  }
}
