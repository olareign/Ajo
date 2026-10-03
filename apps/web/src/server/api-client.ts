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
export async function callApi(
  env: ServerEnv,
  fetchFn: Fetch,
  request: Readonly<{
    path: string;
    method?: "GET" | "POST" | "PUT";
    body?: object;
    accessToken?: string;
    /** Wait for a cold start instead of giving up after 10 seconds. */
    patient?: boolean;
    /** The visitor behind this call, passed to the API when the shared secret is configured. */
    client?: ClientContext;
  }>,
): Promise<ApiResult> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (request.body) headers["Content-Type"] = "application/json";
  if (request.accessToken) headers.Authorization = `Bearer ${request.accessToken}`;
  // Only with something to say, and only server to server: the secret is never sent to the browser.
  if (env.bffSecret && (request.client?.ip || request.client?.userAgent)) {
    headers["X-Ajo-Bff-Secret"] = env.bffSecret;
    if (request.client.ip) headers["X-Ajo-Client-Ip"] = request.client.ip;
    if (request.client.userAgent) headers["X-Ajo-Client-Ua"] = request.client.userAgent;
  }
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
