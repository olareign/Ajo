import type { ClientContext } from "./client-context";
import type { ServerEnv } from "./env";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type ApiResult = Readonly<{ status: number; data: Record<string, unknown> }>;

/** A server on a sleeping plan can take up to a minute to wake; sign-in and sign-up wait for it. */
export const COLD_START_TIMEOUT_MS = 55_000;

export const UNREACHABLE = "We couldn't reach Àjọ. Check your connection and try again.";

/**
 * Server-side call to the API. Only the fields given are sent: the browser's cookies and
 * headers never pass through. Failures to connect become a plain 502 for the user.
 */
function buildHeaders(
  env: ServerEnv,
  request: Readonly<{
    accessToken?: string;
    headers?: Readonly<Record<string, string>>;
    client?: ClientContext;
  }>,
  accept: string,
): Record<string, string> {
  const headers: Record<string, string> = { Accept: accept, ...request.headers };
  if (request.accessToken) headers.Authorization = `Bearer ${request.accessToken}`;
  // Only with something to say, and only server to server: the secret is never sent to the browser.
  if (env.bffSecret && (request.client?.ip || request.client?.userAgent)) {
    headers["X-Ajo-Bff-Secret"] = env.bffSecret;
    if (request.client.ip) headers["X-Ajo-Client-Ip"] = request.client.ip;
    if (request.client.userAgent) headers["X-Ajo-Client-Ua"] = request.client.userAgent;
  }
  return headers;
}

export type BinaryResult = Readonly<{
  status: number;
  /** The file, when the API sent one. */
  bytes?: ArrayBuffer;
  contentType?: string;
  /** What the API said, when it answered in words. */
  data: Record<string, unknown>;
}>;

/**
 * A call whose request or answer is a file (a profile picture), not JSON. Like `callApi`, only the
 * fields named here are sent; an answer that is JSON comes back parsed.
 */
export async function callApiBinary(
  env: ServerEnv,
  fetchFn: Fetch,
  request: Readonly<{
    path: string;
    method: "GET" | "PUT" | "DELETE";
    body?: ArrayBuffer;
    contentType?: string;
    accessToken?: string;
    client?: ClientContext;
  }>,
): Promise<BinaryResult> {
  const headers = buildHeaders(env, request, "*/*");
  if (request.contentType) headers["Content-Type"] = request.contentType;
  try {
    const res = await fetchFn(`${env.apiBaseUrl}/api/v1${request.path}`, {
      method: request.method,
      headers,
      body: request.body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && !type.includes("application/json") && res.status !== 204) {
      return { status: res.status, bytes: await res.arrayBuffer(), contentType: type, data: {} };
    }
    const data =
      res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as Record<string, unknown>);
    return { status: res.status, data };
  } catch {
    return { status: 502, data: { message: UNREACHABLE } };
  }
}

export async function callApi(
  env: ServerEnv,
  fetchFn: Fetch,
  request: Readonly<{
    path: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: object;
    accessToken?: string;
    /** Wait for a cold start instead of giving up after 10 seconds. */
    patient?: boolean;
    /** Extra headers the API needs for this one call (named by the caller, never copied from the browser). */
    headers?: Readonly<Record<string, string>>;
    /** The visitor behind this call, passed to the API when the shared secret is configured. */
    client?: ClientContext;
  }>,
): Promise<ApiResult> {
  const headers = buildHeaders(env, request, "application/json");
  if (request.body) headers["Content-Type"] = "application/json";
  try {
    const res = await fetchFn(`${env.apiBaseUrl}/api/v1${request.path}`, {
      method: request.method ?? "POST",
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(request.patient ? COLD_START_TIMEOUT_MS : 10_000),
    });
    const data =
      res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as Record<string, unknown>);
    return { status: res.status, data };
  } catch {
    return { status: 502, data: { message: UNREACHABLE } };
  }
}
