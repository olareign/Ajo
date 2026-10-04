import type { Loaded } from "./wallet-client";
import type { KycState } from "./kyc";

export type Rails = Readonly<{
  country: "NG" | "GB" | null;
  currency: "NGN" | "GBP" | null;
  kycApproved: boolean;
  connected: Readonly<{ fund: boolean; mandate: boolean; withdraw: boolean }>;
}>;

async function load<T>(url: string, accept: (body: Record<string, unknown>) => T | null) {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (res.status === 401) return { status: "signed-out" } as const;
    if (!res.ok) return { status: "failed" } as const;
    const data = accept((await res.json()) as Record<string, unknown>);
    return data === null ? ({ status: "failed" } as const) : ({ status: "ok", data } as const);
  } catch {
    return { status: "failed" } as const;
  }
}

export const loadKyc = (): Promise<Loaded<KycState>> =>
  load("/api/kyc", (body) =>
    typeof body.status === "string" && Array.isArray(body.steps)
      ? (body as unknown as KycState)
      : null,
  );

export const loadRails = (): Promise<Loaded<Rails>> =>
  load("/api/wallet/rails", (body) =>
    typeof body.connected === "object" && body.connected !== null
      ? (body as unknown as Rails)
      : null,
  );
