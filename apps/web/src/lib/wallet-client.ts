import type { Wallet, WalletTransaction } from "./wallet";

/** What came back, in the three ways a screen has to react to. */
export type Loaded<T> =
  | Readonly<{ status: "ok"; data: T }>
  | Readonly<{ status: "signed-out" }>
  | Readonly<{ status: "failed" }>;

export type TransactionPage = Readonly<{ items: WalletTransaction[]; next: string | null }>;

export const PAGE_SIZE = 20;

async function load<T>(
  url: string,
  accept: (body: Record<string, unknown>) => T | null,
): Promise<Loaded<T>> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (res.status === 401) return { status: "signed-out" };
    if (!res.ok) return { status: "failed" };
    const data = accept((await res.json()) as Record<string, unknown>);
    return data === null ? { status: "failed" } : { status: "ok", data };
  } catch {
    return { status: "failed" };
  }
}

export const loadWallets = () =>
  load("/api/wallet", (body) => (Array.isArray(body.wallets) ? (body.wallets as Wallet[]) : null));

export const loadTransactions = (before?: string) =>
  load(`/api/wallet/transactions?limit=${PAGE_SIZE}${before ? `&before=${before}` : ""}`, (body) =>
    Array.isArray(body.items) && (typeof body.next === "string" || body.next === null)
      ? ({ items: body.items as WalletTransaction[], next: body.next } satisfies TransactionPage)
      : null,
  );
