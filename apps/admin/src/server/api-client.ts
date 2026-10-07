import type { ClientContext } from "./client-context";
import type { ServerEnv } from "./env";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type ApiResult = Readonly<{ status: number; data: unknown }>;

export const UNREACHABLE = "We couldn't reach the server. Try again in a moment.";
export const UNEXPECTED =
  "The server gave an answer we didn't expect. Check the console's API address, then try again.";

/**
 * A server-side call to the API as a staff member. Only what is named here is sent: the browser's own
 * cookies and headers never pass through.
 */
export async function callApi(
  env: ServerEnv,
  fetchFn: Fetch,
  request: Readonly<{
    path: string;
    method: "GET" | "POST";
    body?: object;
    token?: string;
    client?: ClientContext;
  }>,
): Promise<ApiResult> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (request.body) headers["Content-Type"] = "application/json";
  if (request.token) headers.Authorization = `Bearer ${request.token}`;
  if (env.bffSecret && (request.client?.ip || request.client?.userAgent)) {
    headers["X-Ajo-Bff-Secret"] = env.bffSecret;
    if (request.client.ip) headers["X-Ajo-Client-Ip"] = request.client.ip;
    if (request.client.userAgent) headers["X-Ajo-Client-Ua"] = request.client.userAgent;
  }
  try {
    const res = await fetchFn(`${env.apiBaseUrl}/api/v1${request.path}`, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 204) return { status: 204, data: {} };
    const type = res.headers.get("content-type") ?? "";
    const parsed: unknown = type.includes("json")
      ? await res.json().catch(() => undefined)
      : undefined;
    // A success that is not JSON is not our API (a wrong address, or a host's "waking up" page): say so,
    // rather than passing an empty answer on as if it were a real one.
    if (res.ok && (parsed === undefined || parsed === null || typeof parsed !== "object")) {
      return { status: 502, data: { message: UNEXPECTED, code: "unexpected_answer" } };
    }
    return { status: res.status, data: parsed ?? {} };
  } catch {
    return { status: 502, data: { message: UNREACHABLE } };
  }
}
