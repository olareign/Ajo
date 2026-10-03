// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import { handleMfaConfirm, handleMfaDisable, handleMfaEnrol } from "./mfa-handlers";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});
const base = "https://app.ajo.example";

async function req(method: string, body?: unknown, site = "same-origin") {
  const sealed = await seal(
    { accessToken: "old-access", refreshToken: "old-refresh" },
    env.sessionSecret,
    3600,
  );
  const headers: Record<string, string> = {
    "Sec-Fetch-Site": site,
    Cookie: `__Host-ajo_session=${encodeURIComponent(sealed)}`,
  };
  if (body) headers["Content-Type"] = "application/json";
  return new Request(`${base}/api/auth/mfa/totp`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}
const reply = (status: number, body: unknown = {}) =>
  status === 204 ? new Response(null, { status }) : Response.json(body, { status });

describe("turning on the authenticator app", () => {
  it("starts setup as the signed-in person and never caches the secret", async () => {
    const fetchFn = vi.fn<Fetch>(async () =>
      reply(200, { secret: "S", otpauthUri: "otpauth://x" }),
    );
    const res = await handleMfaEnrol(await req("POST"), { env, fetchFn });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ secret: "S", otpauthUri: "otpauth://x" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/mfa/totp");
    expect(init!.method).toBe("POST");
    expect(new Headers(init!.headers).get("Authorization")).toBe("Bearer old-access");
  });

  it("forwards only the code when confirming, and hands back the recovery codes", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { recoveryCodes: ["a", "b"] }));
    const res = await handleMfaConfirm(await req("POST", { code: "123456", extra: "x" }), {
      env,
      fetchFn,
    });
    expect(await res.json()).toEqual({ recoveryCodes: ["a", "b"] });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/mfa/totp/confirm");
    expect(JSON.parse(init!.body as string)).toEqual({ code: "123456" });
  });

  it("refuses requests that did not come from our own pages", async () => {
    const fetchFn = vi.fn<Fetch>();
    const a = await handleMfaEnrol(await req("POST", undefined, "cross-site"), { env, fetchFn });
    const b = await handleMfaConfirm(await req("POST", { code: "1" }, "cross-site"), {
      env,
      fetchFn,
    });
    expect([a.status, b.status]).toEqual([403, 403]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("turning it off", () => {
  it("sends the password and code with DELETE, and nothing else", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(204));
    const res = await handleMfaDisable(
      await req("DELETE", { password: "p", code: "123456", x: 1 }),
      {
        env,
        fetchFn,
      },
    );
    expect(res.status).toBe(204);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/mfa/totp");
    expect(init!.method).toBe("DELETE");
    expect(JSON.parse(init!.body as string)).toEqual({ password: "p", code: "123456" });
  });

  it("keeps the person signed in when the password or code is wrong", async () => {
    const fetchFn = vi.fn<Fetch>(async () =>
      reply(401, { message: "That password is incorrect.", code: "password_wrong" }),
    );
    const res = await handleMfaDisable(await req("DELETE", { password: "no", code: "123456" }), {
      env,
      fetchFn,
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "password_wrong" });
    // One call only: no refresh attempt, and the session cookie is left alone.
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});
