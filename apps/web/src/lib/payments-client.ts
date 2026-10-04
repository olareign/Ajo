export type PaymentStatus = "created" | "pending" | "succeeded" | "failed" | "reversed";

export type Payment = Readonly<{
  id: string;
  kind: "funding" | "withdrawal";
  status: PaymentStatus;
  method: string;
  amount: Readonly<{ amount: string; currency: string }>;
  /** Where the person goes next to pay, when the partner hosts that step. */
  action: Readonly<{ type: "redirect"; url: string }> | null;
  failureReason: string | null;
  createdAt: string;
}>;

export type MandateStatus = "pending" | "active" | "cancelled" | "failed";
export type MandateView = Readonly<{
  id: string;
  status: MandateStatus;
  action: Readonly<{ type: "redirect"; url: string }> | null;
  createdAt: string;
}>;

export type PayoutAccount = Readonly<{
  bankCode: string;
  bankName: string;
  last4: string;
  accountName: string;
}>;

export type Bank = Readonly<{ code: string; name: string }>;

export type Failure =
  | Readonly<{ kind: "signed-out" }>
  | Readonly<{ kind: "unreachable"; message: string }>
  /** The API said no, and says why in words. `code` is for the screen to act on. */
  | Readonly<{ kind: "refused"; status: number; code?: string; message: string }>;

export type Outcome<T> =
  Readonly<{ ok: true; data: T }> | Readonly<{ ok: false; failure: Failure }>;

const UNREACHABLE = "We couldn't reach Àjọ. Check your connection and try again.";

async function send<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  options: Readonly<{ body?: object; key?: string; code?: string }> = {},
): Promise<Outcome<T>> {
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (options.key) headers["Idempotency-Key"] = options.key;
  if (options.code) headers["X-Ajo-Mfa-Code"] = options.code;
  try {
    const res = await fetch(url, {
      method,
      headers,
      credentials: "same-origin",
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, data: data as T };
    // Our server's own "I couldn't reach the API": the request may or may not have got through.
    if (res.status === 502 || res.status === 504) {
      return {
        ok: false,
        failure: {
          kind: "unreachable",
          message: typeof data.message === "string" ? data.message : UNREACHABLE,
        },
      };
    }
    const code = typeof data.code === "string" ? data.code : undefined;
    // A 401 that carries a code is the API refusing a code, not an end to the session.
    if (res.status === 401 && !code) return { ok: false, failure: { kind: "signed-out" } };
    const message =
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message) && typeof data.message[0] === "string"
          ? data.message[0]
          : "Something went wrong. Nothing was moved.";
    return { ok: false, failure: { kind: "refused", status: res.status, code, message } };
  } catch {
    return { ok: false, failure: { kind: "unreachable", message: UNREACHABLE } };
  }
}

/**
 * A fresh key for each attempt the person makes. Sending the same key again (a double tap, a retry
 * after a dropped connection) is answered with the first result instead of doing it twice, so keep
 * one key for as long as the person is still trying to do the one thing.
 */
export const newAttemptKey = (): string => `ajo_${crypto.randomUUID()}`;

export const startFunding = (input: { amount: string; method: string; key: string }) =>
  send<Payment>("POST", "/api/payments/fund", {
    body: { amount: input.amount, method: input.method },
    key: input.key,
  });

export const startWithdrawal = (input: {
  amount: string;
  pin: string;
  code: string;
  key: string;
}) =>
  send<Payment>("POST", "/api/payments/withdraw", {
    body: { amount: input.amount, pin: input.pin },
    key: input.key,
    code: input.code,
  });

export const loadPayment = (id: string) =>
  send<Payment>("GET", `/api/payments/${encodeURIComponent(id)}`);

// The API answers "none yet" with an empty body, which arrives here as an empty object.
export const loadMandate = async (): Promise<Outcome<MandateView | null>> => {
  const result = await send<Partial<MandateView>>("GET", "/api/payments/mandate");
  if (!result.ok) return result;
  return {
    ok: true,
    data: typeof result.data.id === "string" ? (result.data as MandateView) : null,
  };
};
export const startMandate = () => send<MandateView>("POST", "/api/payments/mandate");
export const cancelMandate = () => send<MandateView>("DELETE", "/api/payments/mandate");

export const loadPayoutAccount = async (): Promise<Outcome<PayoutAccount | null>> => {
  const result = await send<Partial<PayoutAccount>>("GET", "/api/payments/payout-account");
  if (!result.ok) return result;
  return {
    ok: true,
    data: typeof result.data.bankCode === "string" ? (result.data as PayoutAccount) : null,
  };
};

export const savePayoutAccount = (input: {
  bankCode: string;
  accountNumber: string;
  code: string;
}) =>
  send<PayoutAccount>("PUT", "/api/payments/payout-account", {
    body: { bankCode: input.bankCode, accountNumber: input.accountNumber },
    code: input.code,
  });

export const loadBanks = async (): Promise<Outcome<readonly Bank[]>> => {
  const result = await send<{ banks: Bank[] }>("GET", "/api/payments/banks");
  return result.ok ? { ok: true, data: result.data.banks } : result;
};

export const isFinished = (status: PaymentStatus) => status !== "created" && status !== "pending";
