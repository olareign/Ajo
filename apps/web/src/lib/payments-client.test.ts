import {
  cancelMandate,
  isFinished,
  loadBanks,
  loadMandate,
  loadPayment,
  loadPayoutAccount,
  newAttemptKey,
  savePayoutAccount,
  startFunding,
  startMandate,
  startWithdrawal,
} from "./payments-client";

afterEach(() => vi.unstubAllGlobals());

function stub(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const lastCall = (mock: ReturnType<typeof stub>) => {
  const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
};

describe("starting a payment", () => {
  it("sends the amount and method with a safety key, and returns what the API made", async () => {
    const fetchMock = stub(200, {
      id: "p1",
      status: "pending",
      action: { type: "redirect", url: "https://x" },
    });
    const result = await startFunding({ amount: "500000", method: "card", key: "ajo_key_12345" });
    expect(result).toMatchObject({ ok: true, data: { id: "p1" } });
    const call = lastCall(fetchMock);
    expect(call.url).toBe("/api/payments/fund");
    expect(call.init.method).toBe("POST");
    expect(JSON.parse(call.init.body as string)).toEqual({ amount: "500000", method: "card" });
    expect(call.headers["Idempotency-Key"]).toBe("ajo_key_12345");
  });

  it("sends the PIN in the body and the authenticator code in its header, never the other way round", async () => {
    const fetchMock = stub(200, { id: "w1", status: "pending" });
    await startWithdrawal({ amount: "40000", pin: "493817", code: "123456", key: "ajo_key_12345" });
    const call = lastCall(fetchMock);
    expect(JSON.parse(call.init.body as string)).toEqual({ amount: "40000", pin: "493817" });
    expect(call.headers["X-Ajo-Mfa-Code"]).toBe("123456");
    expect(call.url).not.toContain("123456");
    expect(call.url).not.toContain("493817");
  });

  it("makes a different key for every attempt", () => {
    expect(newAttemptKey()).not.toBe(newAttemptKey());
    expect(newAttemptKey()).toMatch(/^ajo_[0-9a-f-]{36}$/);
  });
});

describe("what went wrong", () => {
  it("keeps the API's words and code, so the screen can say why and act on it", async () => {
    stub(403, { message: "Finish verification first.", code: "kyc_required" });
    expect(await startFunding({ amount: "1", method: "card", key: "ajo_key_12345" })).toEqual({
      ok: false,
      failure: {
        kind: "refused",
        status: 403,
        code: "kyc_required",
        message: "Finish verification first.",
      },
    });
  });

  it("treats a 401 with no code as a signed-out visitor, and a 401 with a code as a refused code", async () => {
    stub(401, { message: "Please sign in." });
    expect(await loadMandate()).toEqual({ ok: false, failure: { kind: "signed-out" } });
    stub(401, { message: "Enter your code.", code: "mfa_code_required" });
    expect(
      await startWithdrawal({ amount: "1", pin: "493817", code: "", key: "ajo_key_12345" }),
    ).toMatchObject({ ok: false, failure: { kind: "refused", code: "mfa_code_required" } });
  });

  it("takes the first message when validation says several", async () => {
    stub(400, { message: ["amount must match", "other"] });
    expect(await startFunding({ amount: "0", method: "card", key: "ajo_key_12345" })).toMatchObject(
      {
        failure: { message: "amount must match" },
      },
    );
  });

  it("treats our server's 502 and 504 as not having reached the API, as a dropped connection is", async () => {
    stub(502, { message: "We couldn't reach Àjọ." });
    expect(await loadMandate()).toEqual({
      ok: false,
      failure: { kind: "unreachable", message: "We couldn't reach Àjọ." },
    });
    stub(504, {});
    expect(await loadMandate()).toMatchObject({ failure: { kind: "unreachable" } });
    stub(503, { message: "Not available.", code: "payments_unavailable" });
    expect(await loadMandate()).toMatchObject({ failure: { kind: "refused", status: 503 } });
  });

  it("says it could not connect, and that nothing moved, when the request never arrives", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const result = await startFunding({ amount: "1", method: "card", key: "ajo_key_12345" });
    expect(result).toMatchObject({ ok: false, failure: { kind: "unreachable" } });
  });
});

describe("reading", () => {
  it("looks up a payment by an encoded id", async () => {
    const fetchMock = stub(200, { id: "a/b", status: "succeeded" });
    await loadPayment("a/b");
    expect(lastCall(fetchMock).url).toBe("/api/payments/a%2Fb");
  });

  it("reads an empty answer as 'none yet' for the mandate and the payout account", async () => {
    stub(200, {});
    expect(await loadMandate()).toEqual({ ok: true, data: null });
    expect(await loadPayoutAccount()).toEqual({ ok: true, data: null });
    stub(200, { id: "m", status: "active" });
    expect(await loadMandate()).toMatchObject({ ok: true, data: { status: "active" } });
    stub(200, { bankCode: "058", bankName: "GTBank", last4: "6789", accountName: "ADA" });
    expect(await loadPayoutAccount()).toMatchObject({ ok: true, data: { bankName: "GTBank" } });
  });

  it("unwraps the list of banks", async () => {
    stub(200, { banks: [{ code: "058", name: "GTBank" }] });
    expect(await loadBanks()).toEqual({ ok: true, data: [{ code: "058", name: "GTBank" }] });
  });

  it("starts and cancels auto-debit, and saves a payout account with the code in its header", async () => {
    let mock = stub(200, { id: "m", status: "pending" });
    await startMandate();
    expect(lastCall(mock)).toMatchObject({
      url: "/api/payments/mandate",
      init: { method: "POST" },
    });
    mock = stub(200, { id: "m", status: "cancelled" });
    await cancelMandate();
    expect(lastCall(mock).init.method).toBe("DELETE");
    mock = stub(200, { bankCode: "058" });
    await savePayoutAccount({ bankCode: "058", accountNumber: "0123456789", code: "654321" });
    const call = lastCall(mock);
    expect(call.init.method).toBe("PUT");
    expect(call.headers["X-Ajo-Mfa-Code"]).toBe("654321");
    expect(JSON.parse(call.init.body as string)).toEqual({
      bankCode: "058",
      accountNumber: "0123456789",
    });
  });

  it("knows when a payment is settled", () => {
    expect(["succeeded", "failed", "reversed"].every((s) => isFinished(s as never))).toBe(true);
    expect(["created", "pending"].some((s) => isFinished(s as never))).toBe(false);
  });
});
