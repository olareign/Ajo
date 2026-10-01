// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import { handleMe, handleSetPin, handleUpdateProfile } from "./me-handlers";
import { openSeal, seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});
const base = "https://app.ajo.example";

async function req(method: string, path: string, body?: unknown, signedIn = true) {
  const headers: Record<string, string> = { "Sec-Fetch-Site": "same-origin" };
  if (body) headers["Content-Type"] = "application/json";
  if (signedIn) {
    const sealed = await seal(
      { accessToken: "old-access", refreshToken: "old-refresh" },
      env.sessionSecret,
      3600,
    );
    headers.Cookie = `__Host-ajo_session=${encodeURIComponent(sealed)}`;
  }
  return new Request(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}
const ok = (status: number, body: unknown = {}) =>
  status === 204 ? new Response(null, { status }) : Response.json(body, { status });

describe("session-aware calls", () => {
  it("sends the access token and returns the API's answer", async () => {
    const fetchFn = vi.fn<Fetch>(async () => ok(200, { onboarded: true }));
    const res = await handleMe(await req("GET", "/api/me"), { env, fetchFn });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ onboarded: true });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/me");
    expect(new Headers(init!.headers).get("Authorization")).toBe("Bearer old-access");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("is 401 without a session and never calls the API", async () => {
    const fetchFn = vi.fn<Fetch>();
    const res = await handleMe(await req("GET", "/api/me", undefined, false), { env, fetchFn });
    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refreshes an expired access token once, retries, and stores the rotated tokens", async () => {
    const fetchFn = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(ok(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(ok(200, { accessToken: "new-access", refreshToken: "new-refresh" }))
      .mockResolvedValueOnce(ok(200, { onboarded: false }));
    const res = await handleMe(await req("GET", "/api/me"), { env, fetchFn });
    expect(res.status).toBe(200);
    expect(JSON.parse(fetchFn.mock.calls[1]![1]!.body as string)).toEqual({
      refreshToken: "old-refresh",
    });
    expect(new Headers(fetchFn.mock.calls[2]![1]!.headers).get("Authorization")).toBe(
      "Bearer new-access",
    );
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("__Host-ajo_session="))!;
    const session = await openSeal<{ accessToken: string; refreshToken: string }>(
      decodeURIComponent(cookie.split(";")[0]!.slice("__Host-ajo_session=".length)),
      env.sessionSecret,
    );
    expect(session).toEqual({ accessToken: "new-access", refreshToken: "new-refresh" });
  });

  it("clears the session and says 401 when the refresh token is refused", async () => {
    const fetchFn = vi.fn<Fetch>().mockResolvedValueOnce(ok(401)).mockResolvedValueOnce(ok(401));
    const res = await handleMe(await req("GET", "/api/me"), { env, fetchFn });
    expect(res.status).toBe(401);
    expect(res.headers.getSetCookie().join(";")).toMatch(/__Host-ajo_session=;.*Max-Age=0/);
  });
});

describe("profile and PIN", () => {
  it("forwards only country and goal", async () => {
    const fetchFn = vi.fn<Fetch>(async () => ok(204));
    const res = await handleUpdateProfile(
      await req("PUT", "/api/me/profile", { country: "NG", goal: "solo", admin: true }),
      { env, fetchFn },
    );
    expect(res.status).toBe(204);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/me/profile");
    expect(init!.method).toBe("PUT");
    expect(JSON.parse(init!.body as string)).toEqual({ country: "NG", goal: "solo" });
  });

  it("forwards only the PIN", async () => {
    const fetchFn = vi.fn<Fetch>(async () => ok(204));
    await handleSetPin(await req("PUT", "/api/me/pin", { pin: "493817", x: 1 }), { env, fetchFn });
    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).toEqual({ pin: "493817" });
  });

  it("refuses requests that did not come from our own pages", async () => {
    const fetchFn = vi.fn<Fetch>();
    const r = new Request(`${base}/api/me/pin`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" },
      body: JSON.stringify({ pin: "493817" }),
    });
    expect((await handleSetPin(r, { env, fetchFn })).status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
