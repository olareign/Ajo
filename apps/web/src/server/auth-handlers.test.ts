// @vitest-environment node
import type { Fetch } from "./api-client";
import {
  handleForgotPassword,
  handleMfaSignIn,
  handleResendVerification,
  handleResetPassword,
  handleSignIn,
  handleSignOut,
  handleSignOutAll,
  handleSignUp,
  handleVerifyEmail,
} from "./auth-handlers";
import { loadServerEnv } from "./env";
import { openSeal, seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});
const base = "https://app.ajo.example";

function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = { "Sec-Fetch-Site": "same-origin" },
) {
  return new Request(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
function apiReturning(status: number, body: unknown) {
  return vi.fn<Fetch>(async () => Response.json(body, { status }));
}
function cookieValue(res: Response, name: string) {
  const header = res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  return header ? decodeURIComponent(header.split(";")[0]!.slice(name.length + 1)) : undefined;
}

describe("handleSignUp", () => {
  it("forwards only the expected fields to the API and relays its answer", async () => {
    const fetchFn = apiReturning(202, { message: "Check your email to continue." });
    const res = await handleSignUp(
      post("/api/auth/sign-up", {
        email: "a@b.co",
        password: "pw",
        displayName: "Ada",
        isAdmin: true,
      }),
      { env, fetchFn },
    );
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ message: "Check your email to continue." });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/sign-up");
    expect(JSON.parse(init!.body as string)).toEqual({
      email: "a@b.co",
      password: "pw",
      displayName: "Ada",
    });
    expect(new Headers(init!.headers).get("cookie")).toBeNull();
  });

  it("passes the bot-check token on, and relays a refusal's code", async () => {
    const fetchFn = apiReturning(400, {
      message: "Please complete the check and try again.",
      code: "bot_check_failed",
    });
    const res = await handleSignUp(
      post("/api/auth/sign-up", {
        email: "a@b.co",
        password: "pw",
        displayName: "Ada",
        botToken: "token-from-the-widget",
      }),
      { env, fetchFn },
    );
    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).toEqual({
      email: "a@b.co",
      password: "pw",
      displayName: "Ada",
      botToken: "token-from-the-widget",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "bot_check_failed" });
  });

  it("relays field problems so the form can show them", async () => {
    const fetchFn = apiReturning(400, {
      message: "Password does not meet the requirements",
      details: { password: ["breached"] },
    });
    const res = await handleSignUp(
      post("/api/auth/sign-up", { email: "a@b.co", password: "x", displayName: "A" }),
      { env, fetchFn },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).details).toEqual({ password: ["breached"] });
  });

  it("refuses cross-site requests", async () => {
    const fetchFn = apiReturning(202, {});
    const res = await handleSignUp(
      post("/api/auth/sign-up", {}, { "Sec-Fetch-Site": "cross-site" }),
      { env, fetchFn },
    );
    expect(res.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("says plainly when the service cannot be reached", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("ECONNREFUSED api.internal");
    });
    const res = await handleSignUp(
      post("/api/auth/sign-up", { email: "a@b.co", password: "x", displayName: "A" }),
      { env, fetchFn },
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.message).toBe("We couldn't reach Àjọ. Check your connection and try again.");
    expect(JSON.stringify(body)).not.toContain("api.internal");
  });

  it("rejects bodies that are not a JSON object", async () => {
    const req = new Request(`${base}/api/auth/sign-up`, {
      method: "POST",
      headers: { "Sec-Fetch-Site": "same-origin" },
      body: "[1,2]",
    });
    expect((await handleSignUp(req, { env, fetchFn: apiReturning(202, {}) })).status).toBe(400);
  });
});

describe("handleResendVerification", () => {
  it("forwards only the email to the API and relays its answer", async () => {
    const fetchFn = apiReturning(202, { message: "If that account still needs confirming..." });
    const res = await handleResendVerification(
      post("/api/auth/resend-verification", { email: "a@b.co", isAdmin: true }),
      { env, fetchFn },
    );
    expect(res.status).toBe(202);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/email/resend");
    expect(JSON.parse(init!.body as string)).toEqual({ email: "a@b.co" });
  });

  it("refuses cross-site requests without calling the API", async () => {
    const fetchFn = apiReturning(202, {});
    const res = await handleResendVerification(
      post("/api/auth/resend-verification", {}, { "Sec-Fetch-Site": "cross-site" }),
      { env, fetchFn },
    );
    expect(res.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes on a rate-limit answer so the screen can say so", async () => {
    const res = await handleResendVerification(
      post("/api/auth/resend-verification", { email: "a@b.co" }),
      { env, fetchFn: apiReturning(429, { message: "Too many requests. Try again later." }) },
    );
    expect(res.status).toBe(429);
  });
});

describe("handleSignIn", () => {
  it("relays the 'email not confirmed' code, with no cookie, so the app can send the person to check their email", async () => {
    const fetchFn = apiReturning(403, {
      message: "Verify your email before signing in.",
      code: "email_not_verified",
    });
    const res = await handleSignIn(post("/api/auth/sign-in", { email: "a@b.co", password: "pw" }), {
      env,
      fetchFn,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("email_not_verified");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("keeps tokens in a sealed httpOnly cookie, never in the response body", async () => {
    const fetchFn = apiReturning(200, {
      tokenType: "Bearer",
      accessToken: "acc",
      expiresIn: 900,
      refreshToken: "ref",
    });
    const res = await handleSignIn(post("/api/auth/sign-in", { email: "a@b.co", password: "pw" }), {
      env,
      fetchFn,
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("acc");
    expect(text).not.toContain("ref");

    const header = res.headers.getSetCookie().find((c) => c.startsWith("__Host-ajo_session="))!;
    expect(header).toMatch(/HttpOnly/);
    expect(header).toMatch(/Secure/);
    expect(header).toMatch(/SameSite=Strict/);
    expect(header).toMatch(/Path=\//);
    expect(await openSeal(cookieValue(res, "__Host-ajo_session"), env.sessionSecret)).toEqual({
      accessToken: "acc",
      refreshToken: "ref",
    });
  });

  it("holds a second-factor challenge in its own short-lived cookie", async () => {
    const fetchFn = apiReturning(200, { mfaRequired: true, mfaToken: "challenge" });
    const res = await handleSignIn(post("/api/auth/sign-in", { email: "a@b.co", password: "pw" }), {
      env,
      fetchFn,
    });
    expect(await res.json()).toEqual({ mfaRequired: true });
    expect(res.headers.getSetCookie().some((c) => c.startsWith("__Host-ajo_session="))).toBe(false);
    expect(await openSeal(cookieValue(res, "__Host-ajo_mfa"), env.sessionSecret)).toEqual({
      mfaToken: "challenge",
    });
    expect(res.headers.getSetCookie().find((c) => c.startsWith("__Host-ajo_mfa="))).toMatch(
      /Max-Age=300/,
    );
  });

  it("relays a failed sign-in without setting any cookie", async () => {
    const fetchFn = apiReturning(401, { message: "Email or password is incorrect." });
    const res = await handleSignIn(post("/api/auth/sign-in", { email: "a@b.co", password: "x" }), {
      env,
      fetchFn,
    });
    expect(res.status).toBe(401);
    expect((await res.json()).message).toBe("Email or password is incorrect.");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("refuses cross-site requests", async () => {
    const res = await handleSignIn(
      post("/api/auth/sign-in", {}, { Origin: "https://evil.example" }),
      {
        env,
        fetchFn: apiReturning(200, {}),
      },
    );
    expect(res.status).toBe(403);
  });
});

describe("handleSignOut", () => {
  it("ends the session at the API and clears the cookie, even if the API is down", async () => {
    const sealed = await seal({ accessToken: "acc", refreshToken: "ref" }, env.sessionSecret, 60);
    const req = new Request(`${base}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        "Sec-Fetch-Site": "same-origin",
        Cookie: `__Host-ajo_session=${encodeURIComponent(sealed)}`,
      },
    });
    const fetchFn = vi.fn<Fetch>(async () => {
      throw new Error("down");
    });
    const res = await handleSignOut(req, { env, fetchFn });
    expect(res.status).toBe(204);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.ajo.example/api/v1/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(new Headers(fetchFn.mock.calls[0]![1]!.headers).get("authorization")).toBe("Bearer acc");
    expect(res.headers.getSetCookie().find((c) => c.startsWith("__Host-ajo_session="))).toMatch(
      /Max-Age=0/,
    );
  });
});

describe("handleSignOutAll", () => {
  const signedIn = async () => {
    const sealed = await seal({ accessToken: "acc", refreshToken: "ref" }, env.sessionSecret, 60);
    return {
      "Sec-Fetch-Site": "same-origin",
      Cookie: `__Host-ajo_session=${encodeURIComponent(sealed)}`,
    };
  };

  it("ends every session at the API, then clears this device's cookie", async () => {
    const fetchFn = vi.fn<Fetch>(async () => new Response(null, { status: 204 }));
    const res = await handleSignOutAll(
      new Request(`${base}/api/auth/sign-out-all`, { method: "POST", headers: await signedIn() }),
      { env, fetchFn },
    );
    expect(res.status).toBe(204);
    expect(fetchFn.mock.calls[0]![0]).toBe("https://api.ajo.example/api/v1/auth/logout-all");
    expect(new Headers(fetchFn.mock.calls[0]![1]!.headers).get("authorization")).toBe("Bearer acc");
    expect(res.headers.getSetCookie().find((c) => c.startsWith("__Host-ajo_session="))).toMatch(
      /Max-Age=0/,
    );
  });

  it("does not claim success when the API could not end the sessions, and keeps the person signed in to try again", async () => {
    const fetchFn = vi.fn<Fetch>(async () => {
      throw new Error("down");
    });
    const res = await handleSignOutAll(
      new Request(`${base}/api/auth/sign-out-all`, { method: "POST", headers: await signedIn() }),
      { env, fetchFn },
    );
    expect(res.status).toBe(502);
    expect(
      res.headers.getSetCookie().find((c) => c.startsWith("__Host-ajo_session=")),
    ).toBeUndefined();
  });

  it("still ends every session when the access token has expired: it refreshes first, instead of pretending", async () => {
    const fetchFn = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(Response.json({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ accessToken: "new-acc", refreshToken: "new-ref" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await handleSignOutAll(
      new Request(`${base}/api/auth/sign-out-all`, { method: "POST", headers: await signedIn() }),
      { env, fetchFn },
    );
    expect(res.status).toBe(204);
    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
      "https://api.ajo.example/api/v1/auth/logout-all",
      "https://api.ajo.example/api/v1/auth/refresh",
      "https://api.ajo.example/api/v1/auth/logout-all",
    ]);
    expect(new Headers(fetchFn.mock.calls[2]![1]!.headers).get("authorization")).toBe(
      "Bearer new-acc",
    );
    const cookies = res.headers.getSetCookie().filter((c) => c.startsWith("__Host-ajo_session="));
    expect(cookies.every((c) => /Max-Age=0/.test(c))).toBe(true);
  });

  it("clears the cookie and says 401 when the session is already gone", async () => {
    const fetchFn = apiReturning(401, { message: "Unauthorized" });
    const res = await handleSignOutAll(
      new Request(`${base}/api/auth/sign-out-all`, { method: "POST", headers: await signedIn() }),
      { env, fetchFn },
    );
    expect(res.status).toBe(204);
    expect(res.headers.getSetCookie().find((c) => c.startsWith("__Host-ajo_session="))).toMatch(
      /Max-Age=0/,
    );
  });

  it("refuses a request that did not come from our own pages, and without a session does nothing at the API", async () => {
    const fetchFn = vi.fn<Fetch>();
    const crossSite = new Request(`${base}/api/auth/sign-out-all`, {
      method: "POST",
      headers: { ...(await signedIn()), "Sec-Fetch-Site": "cross-site" },
    });
    expect((await handleSignOutAll(crossSite, { env, fetchFn })).status).toBe(403);
    const anonymous = new Request(`${base}/api/auth/sign-out-all`, {
      method: "POST",
      headers: { "Sec-Fetch-Site": "same-origin" },
    });
    expect((await handleSignOutAll(anonymous, { env, fetchFn })).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("the visitor's own address and device", () => {
  it("reach the API on sign-in when the shared secret is configured, so limits and alerts are per person", async () => {
    const shared = loadServerEnv({
      NODE_ENV: "production",
      API_BASE_URL: "https://api.ajo.example",
      SESSION_SECRET: "k".repeat(40),
      BFF_SHARED_SECRET: "b".repeat(48),
    });
    const fetchFn = apiReturning(401, { message: "Email or password is incorrect." });
    await handleSignIn(
      post(
        "/api/auth/sign-in",
        { email: "a@b.co", password: "pw" },
        {
          "Sec-Fetch-Site": "same-origin",
          "x-real-ip": "102.89.34.7",
          "user-agent": "Mozilla/5.0 (Linux; Android 14) Chrome/130",
        },
      ),
      { env: shared, fetchFn },
    );
    const headers = new Headers(fetchFn.mock.calls[0]![1]!.headers);
    expect(headers.get("x-ajo-bff-secret")).toBe("b".repeat(48));
    expect(headers.get("x-ajo-client-ip")).toBe("102.89.34.7");
    expect(headers.get("x-ajo-client-ua")).toBe("Mozilla/5.0 (Linux; Android 14) Chrome/130");
    // still only the browser's own cookies never travel
    expect(headers.get("cookie")).toBeNull();
  });
});

describe("handleVerifyEmail", () => {
  it("sends only the token to the API and relays the result", async () => {
    const fetchFn = apiReturning(200, { message: "Email confirmed." });
    const res = await handleVerifyEmail(
      post("/api/auth/verify-email", { token: "t".repeat(43), extra: 1 }),
      { env, fetchFn },
    );
    expect(res.status).toBe(200);
    expect(fetchFn.mock.calls[0]![0]).toBe("https://api.ajo.example/api/v1/auth/email/verify");
    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).toEqual({
      token: "t".repeat(43),
    });
  });

  it("refuses cross-site requests without calling the API", async () => {
    const fetchFn = apiReturning(200, {});
    const res = await handleVerifyEmail(
      post("/api/auth/verify-email", { token: "x" }, { "Sec-Fetch-Site": "cross-site" }),
      {
        env,
        fetchFn,
      },
    );
    expect(res.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("handleMfaSignIn", () => {
  async function withChallenge(body: unknown, mfaToken = "m".repeat(43)) {
    const sealed = await seal({ mfaToken }, env.sessionSecret, 60);
    return new Request(`${base}/api/auth/mfa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Sec-Fetch-Site": "same-origin",
        Cookie: `__Host-ajo_mfa=${encodeURIComponent(sealed)}`,
      },
      body: JSON.stringify(body),
    });
  }

  it("finishes the sign-in with the code and the challenge from the cookie, then starts the session", async () => {
    const fetchFn = apiReturning(200, { accessToken: "acc", refreshToken: "ref" });
    const res = await handleMfaSignIn(await withChallenge({ code: "123456", extra: 1 }), {
      env,
      fetchFn,
    });
    expect(res.status).toBe(200);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/login/mfa");
    expect(JSON.parse(init!.body as string)).toEqual({ mfaToken: "m".repeat(43), code: "123456" });
    expect(await openSeal(cookieValue(res, "__Host-ajo_session"), env.sessionSecret)).toEqual({
      accessToken: "acc",
      refreshToken: "ref",
    });
    expect(res.headers.getSetCookie().find((c) => c.startsWith("__Host-ajo_mfa="))).toMatch(
      /Max-Age=0/,
    );
  });

  it("accepts a recovery code instead of an authenticator code", async () => {
    const fetchFn = apiReturning(200, { accessToken: "a", refreshToken: "r" });
    await handleMfaSignIn(await withChallenge({ recoveryCode: "abcde-fghjk" }), { env, fetchFn });
    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).toEqual({
      mfaToken: "m".repeat(43),
      recoveryCode: "abcde-fghjk",
    });
  });

  it("relays a wrong code without starting a session", async () => {
    const fetchFn = apiReturning(401, { message: "That code is incorrect." });
    const res = await handleMfaSignIn(await withChallenge({ code: "000000" }), { env, fetchFn });
    expect(res.status).toBe(401);
    expect(cookieValue(res, "__Host-ajo_session")).toBeUndefined();
  });

  it("asks the person to start again when there is no challenge, without calling the API", async () => {
    const fetchFn = apiReturning(200, {});
    const res = await handleMfaSignIn(post("/api/auth/mfa", { code: "123456" }), { env, fetchFn });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { message: string }).message).toMatch(/start again/i);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refuses cross-site requests", async () => {
    const fetchFn = apiReturning(200, {});
    const res = await handleMfaSignIn(
      post("/api/auth/mfa", { code: "1" }, { "Sec-Fetch-Site": "cross-site" }),
      { env, fetchFn },
    );
    expect(res.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("password recovery", () => {
  it("asks the API for a reset link, sending only the email", async () => {
    const fetchFn = apiReturning(202, { message: "If that email has an account, we sent a link." });
    const res = await handleForgotPassword(
      post("/api/auth/forgot-password", { email: "ada@example.com", extra: 1 }),
      { env, fetchFn },
    );
    expect(res.status).toBe(202);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/password/forgot");
    expect(JSON.parse(init!.body as string)).toEqual({ email: "ada@example.com" });
  });

  it("sends the link's token with the new password, and nothing else", async () => {
    const fetchFn = apiReturning(200, { message: "Your password has been changed." });
    const res = await handleResetPassword(
      post("/api/auth/reset-password", {
        token: "t".repeat(43),
        password: "Lagos-Mango-Drum-4721",
        extra: 1,
      }),
      { env, fetchFn },
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://api.ajo.example/api/v1/auth/password/reset");
    expect(JSON.parse(init!.body as string)).toEqual({
      token: "t".repeat(43),
      password: "Lagos-Mango-Drum-4721",
    });
  });

  it("never starts a session, even if the API answers with tokens", async () => {
    const res = await handleResetPassword(
      post("/api/auth/reset-password", { token: "t".repeat(43), password: "x" }),
      { env, fetchFn: apiReturning(200, { accessToken: "a", refreshToken: "r" }) },
    );
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("refuses cross-site requests for both", async () => {
    const fetchFn = apiReturning(200, {});
    const cross = { "Sec-Fetch-Site": "cross-site" };
    expect(
      (await handleForgotPassword(post("/x", { email: "a@b.co" }, cross), { env, fetchFn })).status,
    ).toBe(403);
    expect(
      (
        await handleResetPassword(post("/x", { token: "t", password: "p" }, cross), {
          env,
          fetchFn,
        })
      ).status,
    ).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("remembering a device", () => {
  const DEVICE = "d".repeat(43);
  const cookieOf = (res: Response, name: string) =>
    res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));

  function signInWith(cookie?: string) {
    return new Request(`${base}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Sec-Fetch-Site": "same-origin",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ email: "a@b.co", password: "pw" }),
    });
  }

  it("sends the device's secret with a sign-in, so the API can skip the code", async () => {
    const fetchFn = apiReturning(200, { accessToken: "a", refreshToken: "r" });
    await handleSignIn(signInWith(`__Host-ajo_device=${DEVICE}`), { env, fetchFn });
    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).toEqual({
      email: "a@b.co",
      password: "pw",
      deviceToken: DEVICE,
    });
  });

  it("sends nothing extra from a device that has no secret, or a malformed one", async () => {
    const fetchFn = apiReturning(200, { accessToken: "a", refreshToken: "r" });
    await handleSignIn(signInWith(), { env, fetchFn });
    await handleSignIn(signInWith("__Host-ajo_device=not-a-token"), { env, fetchFn });
    for (const [, init] of fetchFn.mock.calls) {
      expect(JSON.parse(init!.body as string)).toEqual({ email: "a@b.co", password: "pw" });
    }
  });

  async function codeStep(body: unknown) {
    const sealed = await seal({ mfaToken: "m".repeat(43) }, env.sessionSecret, 60);
    return new Request(`${base}/api/auth/mfa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Sec-Fetch-Site": "same-origin",
        Cookie: `__Host-ajo_mfa=${encodeURIComponent(sealed)}`,
      },
      body: JSON.stringify(body),
    });
  }

  it("asks the API to remember the device only when the person chose to, and keeps its secret in a cookie JavaScript cannot read", async () => {
    const fetchFn = apiReturning(200, { accessToken: "a", refreshToken: "r", deviceToken: DEVICE });
    const res = await handleMfaSignIn(await codeStep({ code: "123456", trustDevice: true }), {
      env,
      fetchFn,
    });
    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).toMatchObject({
      trustDevice: true,
    });
    const cookie = cookieOf(res, "__Host-ajo_device")!;
    expect(decodeURIComponent(cookie.split(";")[0]!.split("=")[1]!)).toBe(DEVICE);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/Max-Age=\d{6,}/);
    // The secret reaches the browser only as that cookie, never in the page's data.
    expect(JSON.stringify(await res.json())).not.toContain(DEVICE);
  });

  it("sets no device cookie when the person did not ask to be remembered", async () => {
    const fetchFn = apiReturning(200, { accessToken: "a", refreshToken: "r" });
    const res = await handleMfaSignIn(await codeStep({ code: "123456", trustDevice: false }), {
      env,
      fetchFn,
    });
    expect(cookieOf(res, "__Host-ajo_device")).toBeUndefined();
  });

  it("only passes a true or false for the choice", async () => {
    const fetchFn = apiReturning(200, { accessToken: "a", refreshToken: "r" });
    await handleMfaSignIn(await codeStep({ code: "123456", trustDevice: "yes please" }), {
      env,
      fetchFn,
    });
    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).not.toHaveProperty("trustDevice");
  });
});
