// @vitest-environment node
import type { Fetch } from "./api-client";
import { handleAdmin } from "./bff";
import { loadServerEnv } from "./env";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  ADMIN_SESSION_SECRET: "k".repeat(40),
});
const API = "https://api.ajo.example/api/v1";
const ID = "3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b";
const COOKIE = "__Host-ajo_admin";

async function req(
  method: string,
  path: string,
  init: { body?: unknown; signedIn?: boolean; site?: string } = {},
) {
  const headers: Record<string, string> = { "Sec-Fetch-Site": init.site ?? "same-origin" };
  if (init.signedIn !== false) {
    const sealed = await seal({ token: "T".repeat(43) }, env.sessionSecret, 3600);
    headers.Cookie = `${COOKIE}=${encodeURIComponent(sealed)}`;
  }
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  return new Request(`https://console.ajo.example/api/a/${path}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
const ok = (data: unknown = {}, status = 200) =>
  vi.fn<Fetch>(async () => Response.json(data, { status }));
const call = (f: ReturnType<typeof ok>) => {
  const [url, init] = f.mock.calls[0]!;
  return {
    url,
    method: init?.method,
    auth: (init?.headers as Record<string, string>)?.Authorization,
    body: init?.body ? JSON.parse(init.body as string) : undefined,
  };
};
const run = (request: Request, fetchFn: Fetch, path: string) =>
  handleAdmin(request, { env, fetchFn }, path.split("/"));

describe("signing in", () => {
  it("seals the session token into a cookie only the server can open, and never sends it to the browser", async () => {
    const expiresAt = new Date(Date.now() + 8 * 3600_000).toISOString();
    const fetchFn = ok({
      token: "SECRET-TOKEN-SECRET-TOKEN-SECRET-TOKEN-1",
      expiresAt,
      admin: { id: "a", role: "owner" },
    });
    const res = await run(
      await req("POST", "auth/login", {
        signedIn: false,
        body: { email: "a@b.co", password: "p", code: "123456", extra: "x" },
      }),
      fetchFn,
      "auth/login",
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ admin: { id: "a", role: "owner" } });
    expect(call(fetchFn).body).toEqual({ email: "a@b.co", password: "p", code: "123456" });
    const set = res.headers.get("set-cookie")!;
    expect(set).toContain(`${COOKIE}=`);
    expect(set).toMatch(/HttpOnly/);
    expect(set).toMatch(/SameSite=Strict/);
    expect(set).toMatch(/Secure/);
    expect(set).not.toContain("SECRET-TOKEN");
    const maxAge = Number(/Max-Age=(\d+)/.exec(set)![1]);
    expect(maxAge).toBeLessThanOrEqual(8 * 3600);
    expect(maxAge).toBeGreaterThan(8 * 3600 - 120);
  });

  it("tells the browser only the API's own words when sign-in fails, and sets no cookie", async () => {
    const fetchFn = ok(
      {
        message: "Those details didn't work.",
        code: "admin_sign_in_failed",
        requestId: "r",
        stack: "boom",
      },
      401,
    );
    const res = await run(
      await req("POST", "auth/login", {
        signedIn: false,
        body: { email: "a@b.co", password: "p", code: "123456" },
      }),
      fetchFn,
      "auth/login",
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      message: "Those details didn't work.",
      code: "admin_sign_in_failed",
    });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("will not start a session from an answer that carries no token", async () => {
    const res = await run(
      await req("POST", "auth/login", { signedIn: false, body: {} }),
      ok({ admin: {} }),
      "auth/login",
    );
    expect(res.status).toBe(502);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("passes the setup key straight through (nothing to seal yet), and seals a session when joining is confirmed", async () => {
    const start = await run(
      await req("POST", "auth/setup/start", {
        signedIn: false,
        body: { email: "a@b.co", setupCode: "X".repeat(20), password: "p".repeat(14) },
      }),
      ok({ secret: "S", otpauthUri: "otpauth://x" }),
      "auth/setup/start",
    );
    expect(await start.json()).toEqual({ secret: "S", otpauthUri: "otpauth://x" });
    expect(start.headers.get("set-cookie")).toBeNull();
    const confirm = await run(
      await req("POST", "auth/setup/confirm", {
        signedIn: false,
        body: { email: "a@b.co", setupCode: "X".repeat(20), code: "123456" },
      }),
      ok({
        token: "T".repeat(43),
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        admin: { id: "a" },
      }),
      "auth/setup/confirm",
    );
    expect(confirm.status).toBe(200);
    expect(confirm.headers.get("set-cookie")).toContain(`${COOKIE}=`);
  });

  it("sign-in steps come from the console's own pages only", async () => {
    const fetchFn = ok({});
    for (const path of ["auth/login", "auth/setup/start", "auth/setup/confirm"]) {
      const res = await run(
        await req("POST", path, { signedIn: false, site: "cross-site", body: {} }),
        fetchFn,
        path,
      );
      expect(res.status).toBe(403);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("a signed-in member", () => {
  it("is sent to the API with their token, and answered with what the API said", async () => {
    const fetchFn = ok({ users: 3 });
    const res = await run(await req("GET", "overview"), fetchFn, "overview");
    expect(await res.json()).toEqual({ users: 3 });
    expect(call(fetchFn)).toMatchObject({
      url: `${API}/admin/overview`,
      method: "GET",
      auth: `Bearer ${"T".repeat(43)}`,
    });
  });

  it("gets a 401 without a session, and the API is not asked", async () => {
    const fetchFn = ok({});
    const res = await run(await req("GET", "overview", { signedIn: false }), fetchFn, "overview");
    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
    const garbage = new Request("https://console.ajo.example/api/a/overview", {
      headers: { Cookie: `${COOKIE}=garbage` },
    });
    expect((await run(garbage, fetchFn, "overview")).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("is signed out here too when the API says the session has ended, but not when it only refused a code", async () => {
    const ended = await run(
      await req("GET", "overview"),
      ok({ message: "Unauthorized" }, 401),
      "overview",
    );
    expect(ended.status).toBe(401);
    expect(ended.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    const wrongCode = await run(
      await req("POST", `users/${ID}/suspend`, {
        body: { code: "000000", reason: "A good reason" },
      }),
      ok({ message: "Enter a fresh code.", code: "admin_code_required" }, 401),
      `users/${ID}/suspend`,
    );
    expect(wrongCode.status).toBe(401);
    expect(wrongCode.headers.get("set-cookie")).toBeNull();
    expect(await wrongCode.json()).toEqual({
      message: "Enter a fresh code.",
      code: "admin_code_required",
    });
  });

  it("signs out of the API and clears the cookie, even when the API cannot be reached", async () => {
    const fetchFn = vi.fn<Fetch>(async () => {
      throw new Error("down");
    });
    const res = await run(await req("POST", "auth/logout", { body: {} }), fetchFn, "auth/logout");
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("tells the browser when the API is unreachable, in plain words", async () => {
    const fetchFn = vi.fn<Fetch>(async () => {
      throw new Error("down");
    });
    const res = await run(await req("GET", "overview"), fetchFn, "overview");
    expect(res.status).toBe(502);
    expect((await res.json()).message).toMatch(/couldn't reach the server/);
  });
});

describe("what the console may ask for", () => {
  it("knows its own routes only: anything else is a 404, and the API is not asked", async () => {
    const fetchFn = ok({});
    for (const [method, path] of [
      ["GET", "admin/overview"],
      ["GET", "../me"],
      ["GET", "users"],
      ["GET", "users/not-a-uuid"],
      ["GET", `users/${ID}/secret`],
      ["POST", `users/${ID}/delete`],
      ["POST", "auth/setup"],
      ["GET", "team/xyz"],
      ["GET", ""],
    ] as const) {
      const res = await run(await req(method, path), fetchFn, path);
      expect(res.status).toBe(404);
    }
    const put = await run(await req("PUT", "overview"), fetchFn, "overview");
    expect(put.status).toBe(404);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes on only each route's own body fields", async () => {
    const fetchFn = ok({}, 204);
    await run(
      await req("POST", `users/${ID}/suspend`, {
        body: { code: "123456", reason: "Stolen phone", adminId: "x", role: "owner" },
      }),
      fetchFn,
      `users/${ID}/suspend`,
    );
    expect(call(fetchFn).body).toEqual({ code: "123456", reason: "Stolen phone" });
    const f2 = ok({}, 204);
    await run(
      await req("POST", `kyc/${ID}/steps/id`, {
        body: { code: "123456", reason: "Cut off", decision: "rejected", status: "approved" },
      }),
      f2,
      `kyc/${ID}/steps/id`,
    );
    expect(call(f2)).toMatchObject({
      url: `${API}/admin/kyc/${ID}/steps/id`,
      body: { code: "123456", reason: "Cut off", decision: "rejected" },
    });
    const f3 = ok({ setupCode: "A" });
    await run(
      await req("POST", "team", {
        body: { email: "n@ajo.test", name: "N", role: "support", code: "123456", status: "active" },
      }),
      f3,
      "team",
    );
    expect(call(f3).body).toEqual({
      email: "n@ajo.test",
      name: "N",
      role: "support",
      code: "123456",
    });
  });

  it("changes things only from the console's own pages", async () => {
    const fetchFn = ok({}, 204);
    for (const path of [
      `users/${ID}/suspend`,
      `users/${ID}/reinstate`,
      `cases/${ID}/close`,
      `cases/${ID}/notes`,
      "team",
      `team/${ID}/disable`,
      "auth/logout",
    ]) {
      const res = await run(
        await req("POST", path, {
          site: "cross-site",
          body: { code: "123456", reason: "x".repeat(10) },
        }),
        fetchFn,
        path,
      );
      expect(res.status).toBe(403);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes on only the query fields a route knows, each checked", async () => {
    const fetchFn = ok([]);
    await run(await req("GET", "users/search?q=ada&evil=1"), fetchFn, "users/search");
    expect(call(fetchFn).url).toBe(`${API}/admin/users/search?q=ada`);
    const f2 = ok({ items: [], next: null });
    await run(
      await req("GET", "audit?admin=a%40b.co&action=user.&target=abc&before=123&x=1"),
      f2,
      "audit",
    );
    expect(new URL(call(f2).url).searchParams.toString()).toBe(
      "admin=a%40b.co&action=user.&target=abc&before=123",
    );
    for (const bad of [
      "audit?before=12abc",
      "audit?action=DROP%20TABLE",
      "cases?status=all",
      `users/search?q=${"a".repeat(300)}`,
    ]) {
      const path = bad.split("?")[0]!;
      const res = await run(await req("GET", bad), ok({}), path);
      expect(res.status).toBe(400);
    }
  });

  it("answers failures with the API's words and code only, never its internals", async () => {
    const res = await run(
      await req("GET", `users/${ID}`),
      ok(
        { message: "No such person.", code: "person_not_found", stack: "at x", sql: "select" },
        404,
      ),
      `users/${ID}`,
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: "No such person.", code: "person_not_found" });
    const list = await run(
      await req("GET", "overview"),
      ok({ message: ["a must be a string"] }, 400),
      "overview",
    );
    expect((await list.json()).message).toBe("Check what you entered and try again.");
  });

  it("refuses an oversized or non-JSON body", async () => {
    const fetchFn = ok({});
    const big = await run(
      await req("POST", "auth/login", { signedIn: false, body: { email: "a".repeat(11_000) } }),
      fetchFn,
      "auth/login",
    );
    expect(big.status).toBe(400);
    const notJson = new Request("https://console.ajo.example/api/a/auth/login", {
      method: "POST",
      headers: { "Sec-Fetch-Site": "same-origin" },
      body: "nope",
    });
    expect((await run(notJson, fetchFn, "auth/login")).status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("server settings", () => {
  it("refuses to start in production without its own secret, and never reuses the customer app's name for it", () => {
    expect(() =>
      loadServerEnv({ NODE_ENV: "production", API_BASE_URL: "https://x.example" }),
    ).toThrow(/ADMIN_SESSION_SECRET/);
    expect(() =>
      loadServerEnv({
        NODE_ENV: "production",
        API_BASE_URL: "https://x.example",
        SESSION_SECRET: "k".repeat(40),
      }),
    ).toThrow(/ADMIN_SESSION_SECRET/);
    expect(() =>
      loadServerEnv({
        NODE_ENV: "production",
        API_BASE_URL: "http://x.example",
        ADMIN_SESSION_SECRET: "k".repeat(40),
      }),
    ).toThrow(/https/);
    expect(() =>
      loadServerEnv({
        NODE_ENV: "production",
        API_BASE_URL: "https://x.example",
        ADMIN_SESSION_SECRET: "short",
      }),
    ).toThrow(/at least 32/);
  });
});

describe("an answer that is not from our API", () => {
  const html = () =>
    vi.fn<Fetch>(
      async () =>
        new Response("<html>Service is waking up…</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    );

  it("is refused plainly, for sign-in, the setup key and everything else, and starts no session", async () => {
    for (const [path, open] of [
      ["auth/login", true],
      ["auth/setup/start", true],
      ["auth/setup/confirm", true],
      ["me", false],
      ["overview", false],
    ] as const) {
      const res = await run(
        await req(path === "me" || path === "overview" ? "GET" : "POST", path, {
          signedIn: !open,
          body: open ? {} : undefined,
        }),
        html(),
        path,
      );
      expect(res.status).toBe(502);
      expect((await res.json()).code).toBe("unexpected_answer");
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });

  it("will not pass on a setup answer without the key and address, even from a 200", async () => {
    const res = await run(
      await req("POST", "auth/setup/start", { signedIn: false, body: {} }),
      ok({ ok: true }),
      "auth/setup/start",
    );
    expect(res.status).toBe(502);
  });

  it("still passes an empty 204 and a JSON error", async () => {
    expect(
      (
        await run(
          await req("POST", `users/${ID}/suspend`, { body: {} }),
          vi.fn<Fetch>(async () => new Response(null, { status: 204 })),
          `users/${ID}/suspend`,
        )
      ).status,
    ).toBe(204);
    expect(
      (await run(await req("GET", "overview"), ok({ message: "No." }, 403), "overview")).status,
    ).toBe(403);
  });
});
