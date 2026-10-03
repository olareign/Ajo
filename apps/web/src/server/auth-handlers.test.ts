// @vitest-environment node
import type { Fetch } from "./api-client";
import {
  handleForgotPassword,
  handleMfaSignIn,
  handleResendVerification,
  handleResetPassword,
  handleSignIn,
  handleSignOut,
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
