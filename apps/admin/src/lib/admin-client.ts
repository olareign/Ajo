export type Failure = Readonly<{
  status: number;
  message: string;
  code?: string;
  /** The session has ended (or never began): go to the sign-in page. */
  signedOut: boolean;
}>;
export type Result<T> = Readonly<{ ok: true; data: T }> | Readonly<{ ok: false; failure: Failure }>;

const OFFLINE = "We couldn't reach the server. Check your connection and try again.";

/** One call to the console's own server (never the API directly). Never throws. */
export async function call<T>(
  method: "GET" | "POST",
  path: string,
  options: Readonly<{ body?: object; query?: Readonly<Record<string, string | undefined>> }> = {},
): Promise<Result<T>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value) query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query}` : "";
  try {
    const res = await fetch(`/api/a/${path}${suffix}`, {
      method,
      credentials: "same-origin",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data =
      res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as Record<string, unknown>);
    if (res.ok) return { ok: true, data: data as T };
    const code = typeof data.code === "string" ? data.code : undefined;
    return {
      ok: false,
      failure: {
        status: res.status,
        code,
        message: typeof data.message === "string" ? data.message : "Something went wrong.",
        signedOut: res.status === 401 && !code,
      },
    };
  } catch {
    return { ok: false, failure: { status: 0, message: OFFLINE, signedOut: false } };
  }
}

export const get = <T>(path: string, query?: Readonly<Record<string, string | undefined>>) =>
  call<T>("GET", path, { query });
export const post = <T = Record<string, never>>(path: string, body?: object) =>
  call<T>("POST", path, { body: body ?? {} });
