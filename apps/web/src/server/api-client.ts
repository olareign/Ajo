import type { ServerEnv } from "./env";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type ApiResult = Readonly<{ status: number; data: Record<string, unknown> }>;

export const UNREACHABLE = "We couldn't reach Àjọ. Check your connection and try again.";

/**
 * Server-side call to the API. Only the fields given are sent: the browser's cookies and
 * headers never pass through. Failures to connect become a plain 502 for the user.
 */
export async function callApi(
  env: ServerEnv,
  fetchFn: Fetch,
  request: Readonly<{ path: string; method?: "GET" | "POST"; body?: object; accessToken?: string }>,
): Promise<ApiResult> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (request.body) headers["Content-Type"] = "application/json";
  if (request.accessToken) headers.Authorization = `Bearer ${request.accessToken}`;
  try {
    const res = await fetchFn(`${env.apiBaseUrl}/api/v1${request.path}`, {
      method: request.method ?? "POST",
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data =
      res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as Record<string, unknown>);
    return { status: res.status, data };
  } catch {
    return { status: 502, data: { message: UNREACHABLE } };
  }
}
