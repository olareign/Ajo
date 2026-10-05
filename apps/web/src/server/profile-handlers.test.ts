// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import {
  handleEmailSettings,
  handleRemovePhone,
  handleSaveEmailSettings,
  handleSetPhone,
} from "./profile-handlers";
import { handleSecurityPost } from "./security-handlers";
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
  return new Request("https://app.ajo.example/api/me/x", {
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

describe("profile settings through the web server", () => {
  it("sets the phone number with only the number, and removes it", async () => {
    let fetchFn = ok();
    await handleSetPhone(await req("PUT", { phone: "0803 123 4567", userId: "x" }), {
      env,
      fetchFn,
    });
    expect(first(fetchFn)).toEqual({
      url: `${API}/me/phone`,
      method: "PUT",
      body: { phone: "0803 123 4567" },
    });
    fetchFn = ok();
    await handleRemovePhone(await req("DELETE"), { env, fetchFn });
    expect(first(fetchFn)).toMatchObject({ url: `${API}/me/phone`, method: "DELETE" });
  });

  it("reads and saves the email choices, passing on only the four it knows", async () => {
    let fetchFn = ok();
    await handleEmailSettings(await req("GET"), { env, fetchFn });
    expect(first(fetchFn)).toMatchObject({ url: `${API}/notifications/settings`, method: "GET" });
    fetchFn = ok();
    await handleSaveEmailSettings(
      await req("PUT", { friends: false, security: false, userId: "x" }),
      { env, fetchFn },
    );
    expect(first(fetchFn)).toEqual({
      url: `${API}/notifications/settings`,
      method: "PUT",
      body: { friends: false },
    });
  });

  it("closes the account with the password and code only", async () => {
    const fetchFn = ok();
    await handleSecurityPost(
      await req("POST", { password: "p", code: "123456", userId: "x" }),
      { env, fetchFn },
      ["close"],
    );
    expect(first(fetchFn)).toEqual({
      url: `${API}/me/security/close`,
      method: "POST",
      body: { password: "p", code: "123456" },
    });
  });

  it("refuses changes from another site", async () => {
    const fetchFn = ok();
    for (const res of [
      await handleSetPhone(await req("PUT", { phone: "1" }, "cross-site"), { env, fetchFn }),
      await handleRemovePhone(await req("DELETE", undefined, "cross-site"), { env, fetchFn }),
      await handleSaveEmailSettings(await req("PUT", { friends: false }, "cross-site"), {
        env,
        fetchFn,
      }),
      await handleSecurityPost(
        await req("POST", { password: "p" }, "cross-site"),
        { env, fetchFn },
        ["close"],
      ),
    ]) {
      expect(res.status).toBe(403);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
