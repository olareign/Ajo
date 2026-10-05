// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import { handleSecurityDelete, handleSecurityGet, handleSecurityPost } from "./security-handlers";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});

async function req(method: string, body?: unknown, site = "same-origin") {
  const sealed = await seal({ accessToken: "a", refreshToken: "r" }, env.sessionSecret, 3600);
  const headers: Record<string, string> = {
    "Sec-Fetch-Site": site,
    Cookie: `__Host-ajo_session=${encodeURIComponent(sealed)}`,
  };
  if (body) headers["Content-Type"] = "application/json";
  return new Request("https://app.ajo.example/api/me/security/x", {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}
const ok = () => vi.fn<Fetch>(async () => Response.json({}));
const first = (f: ReturnType<typeof ok>) => {
  const [url, init] = f.mock.calls[0]!;
  return {
    url,
    method: init?.method,
    body: init?.body ? JSON.parse(init.body as string) : undefined,
  };
};
const API = "https://api.ajo.example/api/v1";
const ID = "3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b";

describe("account security through the web server", () => {
  it("reads only the three lists it knows", async () => {
    for (const [name, path] of [
      ["sessions", "/me/security/sessions"],
      ["trusted-devices", "/me/security/trusted-devices"],
      ["events", "/me/security/events"],
    ] as const) {
      const fetchFn = ok();
      await handleSecurityGet(await req("GET"), { env, fetchFn }, [name]);
      expect(first(fetchFn)).toMatchObject({ url: `${API}${path}`, method: "GET" });
    }
    const fetchFn = ok();
    for (const bad of [["..", "admin"], ["sessions", "x"], ["toString"], []]) {
      expect((await handleSecurityGet(await req("GET"), { env, fetchFn }, bad)).status).toBe(404);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes each change on with only its own fields, from this app only", async () => {
    const fetchFn = ok();
    await handleSecurityPost(
      await req("POST", { currentPassword: "a", newPassword: "b", code: "123456", userId: "x" }),
      { env, fetchFn },
      ["password"],
    );
    expect(first(fetchFn)).toEqual({
      url: `${API}/me/security/password`,
      method: "POST",
      body: { currentPassword: "a", newPassword: "b", code: "123456" },
    });

    const reset = ok();
    await handleSecurityPost(
      await req("POST", { password: "p", code: "123456", newPin: "582914", currentPin: "1" }),
      { env, fetchFn: reset },
      ["pin", "reset"],
    );
    expect(first(reset).body).toEqual({ password: "p", code: "123456", newPin: "582914" });

    const blocked = ok();
    const res = await handleSecurityPost(
      await req("POST", { currentPin: "1", newPin: "2" }, "cross-site"),
      {
        env,
        fetchFn: blocked,
      },
      ["pin"],
    );
    expect(res.status).toBe(403);
    expect(
      (await handleSecurityPost(await req("POST", {}), { env, fetchFn: blocked }, ["sessions"]))
        .status,
    ).toBe(404);
    expect(blocked).not.toHaveBeenCalled();
  });

  it("signs out a device or forgets one only by a well-formed id", async () => {
    const fetchFn = ok();
    await handleSecurityDelete(await req("DELETE"), { env, fetchFn }, ["sessions", ID]);
    expect(first(fetchFn)).toMatchObject({
      url: `${API}/me/security/sessions/${ID}`,
      method: "DELETE",
    });
    const none = ok();
    for (const bad of [
      ["sessions", "not-an-id"],
      ["sessions", `${ID}/../x`],
      ["events", ID],
      ["sessions", ID, "extra"],
      ["sessions"],
    ]) {
      expect(
        (await handleSecurityDelete(await req("DELETE"), { env, fetchFn: none }, bad)).status,
      ).toBe(404);
    }
    expect(
      (
        await handleSecurityDelete(
          await req("DELETE", undefined, "cross-site"),
          { env, fetchFn: none },
          ["trusted-devices", ID],
        )
      ).status,
    ).toBe(403);
    expect(none).not.toHaveBeenCalled();
  });
});
