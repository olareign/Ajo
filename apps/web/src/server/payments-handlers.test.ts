// @vitest-environment node
import type { Fetch } from "./api-client";
import { loadServerEnv } from "./env";
import {
  handleBanks,
  handleCancelMandate,
  handleCreateMandate,
  handleFund,
  handleMandate,
  handlePayment,
  handlePayoutAccount,
  handleSetPayoutAccount,
  handleWithdraw,
} from "./payments-handlers";
import { seal } from "./session";

const env = loadServerEnv({
  NODE_ENV: "production",
  API_BASE_URL: "https://api.ajo.example",
  SESSION_SECRET: "k".repeat(40),
});
const base = "https://app.ajo.example";
const KEY = "k_0123456789abcdef";
const ID = "3f0c8a52-1d4e-4c7a-9b0e-6a2f5d8c1e47";

async function req(
  method: string,
  body?: unknown,
  extra: Record<string, string> = {},
  site = "same-origin",
) {
  const sealed = await seal(
    { accessToken: "old-access", refreshToken: "old-refresh" },
    env.sessionSecret,
    3600,
  );
  const headers: Record<string, string> = {
    "Sec-Fetch-Site": site,
    Cookie: `__Host-ajo_session=${encodeURIComponent(sealed)}`,
    ...extra,
  };
  if (body) headers["Content-Type"] = "application/json";
  return new Request(`${base}/api/payments/x`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}
const reply = (status: number, body: unknown = {}) => Response.json(body, { status });
const sent = (fetchFn: ReturnType<typeof vi.fn<Fetch>>) => {
  const [url, init] = fetchFn.mock.calls[0]!;
  return { url, init: init!, headers: new Headers(init!.headers) };
};

describe("adding money", () => {
  it("passes on the amount and method, and the safety key, and nothing else", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { id: ID, status: "pending" }));
    const res = await handleFund(
      await req(
        "POST",
        { amount: "500000", method: "card", userId: "someone-else" },
        { "Idempotency-Key": KEY, "X-Forwarded-For": "6.6.6.6", Authorization: "Bearer stolen" },
      ),
      { env, fetchFn },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const call = sent(fetchFn);
    expect(call.url).toBe("https://api.ajo.example/api/v1/payments/fund");
    expect(call.init.method).toBe("POST");
    expect(JSON.parse(call.init.body as string)).toEqual({ amount: "500000", method: "card" });
    expect(call.headers.get("Idempotency-Key")).toBe(KEY);
    expect(call.headers.get("Authorization")).toBe("Bearer old-access");
    expect(call.headers.get("X-Forwarded-For")).toBeNull();
  });

  it.each([
    ["missing", undefined],
    ["too short", "abc"],
    ["with spaces", "a b c d e f g h"],
  ])("refuses a safety key that is %s, and calls nothing", async (_name, key) => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200));
    const res = await handleFund(
      await req("POST", { amount: "1", method: "card" }, key ? { "Idempotency-Key": key } : {}),
      { env, fetchFn },
    );
    expect(res.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refuses a request from another site, and calls nothing", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200));
    const res = await handleFund(
      await req("POST", { amount: "1", method: "card" }, { "Idempotency-Key": KEY }, "cross-site"),
      { env, fetchFn },
    );
    expect(res.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("tells a signed-out visitor to sign in", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200));
    const res = await handleFund(
      new Request(`${base}/api/payments/fund`, {
        method: "POST",
        headers: { "Sec-Fetch-Site": "same-origin", "Idempotency-Key": KEY },
        body: JSON.stringify({ amount: "1", method: "card" }),
      }),
      { env, fetchFn },
    );
    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes the API's own refusal through, so the screen can say why", async () => {
    const fetchFn = vi.fn<Fetch>(async () =>
      reply(403, { message: "Finish verification", code: "kyc_required" }),
    );
    const res = await handleFund(
      await req("POST", { amount: "1", method: "card" }, { "Idempotency-Key": KEY }),
      { env, fetchFn },
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "kyc_required" });
  });
});

describe("taking money out", () => {
  const body = { amount: "40000", pin: "493817" };

  it("passes the PIN in the body and the authenticator code in its header", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { id: ID, status: "pending" }));
    await handleWithdraw(
      await req(
        "POST",
        { ...body, bankCode: "058" },
        { "Idempotency-Key": KEY, "X-Ajo-Mfa-Code": "123456" },
      ),
      { env, fetchFn },
    );
    const call = sent(fetchFn);
    expect(call.url).toBe("https://api.ajo.example/api/v1/payments/withdraw");
    expect(JSON.parse(call.init.body as string)).toEqual(body);
    expect(call.headers.get("X-Ajo-Mfa-Code")).toBe("123456");
    expect(call.headers.get("Idempotency-Key")).toBe(KEY);
  });

  it("lets the API ask for the code when there is none, rather than inventing one", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(401, { code: "mfa_code_required" }));
    const res = await handleWithdraw(await req("POST", body, { "Idempotency-Key": KEY }), {
      env,
      fetchFn,
    });
    expect(sent(fetchFn).headers.get("X-Ajo-Mfa-Code")).toBeNull();
    // A coded 401 is the API refusing an answer, not an expired session: it must not be refreshed away.
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "mfa_code_required" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("refuses a code that is not six digits, and calls nothing", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200));
    const res = await handleWithdraw(
      await req("POST", body, { "Idempotency-Key": KEY, "X-Ajo-Mfa-Code": "12ab56" }),
      { env, fetchFn },
    );
    expect(res.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sets the payout account with the bank's code and the number, and the authenticator code", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { bankName: "GTBank" }));
    await handleSetPayoutAccount(
      await req(
        "PUT",
        { bankCode: "058", accountNumber: "0123456789", accountName: "FAKE" },
        { "X-Ajo-Mfa-Code": "654321" },
      ),
      { env, fetchFn },
    );
    const call = sent(fetchFn);
    expect(call.url).toBe("https://api.ajo.example/api/v1/payments/payout-account");
    expect(call.init.method).toBe("PUT");
    expect(JSON.parse(call.init.body as string)).toEqual({
      bankCode: "058",
      accountNumber: "0123456789",
    });
    expect(call.headers.get("X-Ajo-Mfa-Code")).toBe("654321");
  });
});

describe("auto-debit", () => {
  it("starts and cancels it with no body, from this app only", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { status: "pending" }));
    await handleCreateMandate(await req("POST"), { env, fetchFn });
    expect(sent(fetchFn).url).toBe("https://api.ajo.example/api/v1/payments/mandate");
    expect(sent(fetchFn).init.method).toBe("POST");
    expect(sent(fetchFn).init.body).toBeUndefined();

    const cancel = vi.fn<Fetch>(async () => reply(200, { status: "cancelled" }));
    await handleCancelMandate(await req("DELETE"), { env, fetchFn: cancel });
    expect(sent(cancel).init.method).toBe("DELETE");

    const blocked = vi.fn<Fetch>(async () => reply(200));
    expect(
      (
        await handleCreateMandate(await req("POST", undefined, {}, "cross-site"), {
          env,
          fetchFn: blocked,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await handleCancelMandate(await req("DELETE", undefined, {}, "cross-site"), {
          env,
          fetchFn: blocked,
        })
      ).status,
    ).toBe(403);
    expect(blocked).not.toHaveBeenCalled();
  });

  it("reads the current one", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { status: "active" }));
    const res = await handleMandate(await req("GET"), { env, fetchFn });
    expect(await res.json()).toEqual({ status: "active" });
    expect(sent(fetchFn).url).toBe("https://api.ajo.example/api/v1/payments/mandate");
  });
});

describe("reading", () => {
  it("looks up one payment by a well-formed id only", async () => {
    const fetchFn = vi.fn<Fetch>(async () => reply(200, { id: ID, status: "succeeded" }));
    const res = await handlePayment(await req("GET"), { env, fetchFn }, ID);
    expect(res.status).toBe(200);
    expect(sent(fetchFn).url).toBe(`https://api.ajo.example/api/v1/payments/${ID}`);

    for (const bad of ["banks", "../me", `${ID}/x`, "1; DROP"]) {
      const none = vi.fn<Fetch>(async () => reply(200));
      expect((await handlePayment(await req("GET"), { env, fetchFn: none }, bad)).status).toBe(404);
      expect(none).not.toHaveBeenCalled();
    }
  });

  it("reads the payout account and the list of banks", async () => {
    const account = vi.fn<Fetch>(async () => reply(200, { bankName: "GTBank" }));
    await handlePayoutAccount(await req("GET"), { env, fetchFn: account });
    expect(sent(account).url).toBe("https://api.ajo.example/api/v1/payments/payout-account");
    const banks = vi.fn<Fetch>(async () => reply(200, { banks: [] }));
    await handleBanks(await req("GET"), { env, fetchFn: banks });
    expect(sent(banks).url).toBe("https://api.ajo.example/api/v1/payments/banks");
  });
});
