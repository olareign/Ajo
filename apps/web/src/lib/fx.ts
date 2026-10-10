import type { MoneyDto } from "./money-format";

/** What a wallet is worth in the other currencies Àjọ shows. Display only: nothing changes currency. */
export type FxWallet = Readonly<{
  currency: string;
  total: string;
  equivalents: readonly (MoneyDto & { rate: string })[];
}>;

export type FxEquivalents = Readonly<{
  available: boolean;
  asOf: string | null;
  stale: boolean;
  sample: boolean;
  wallets: readonly FxWallet[];
}>;

/** Reads the API's answer, trusting nothing about its shape: anything odd shows no conversion at all. */
export function readFx(body: Record<string, unknown> | null): FxEquivalents | null {
  if (!body || body.available !== true || !Array.isArray(body.wallets)) return null;
  const isMoney = (v: unknown): v is string => typeof v === "string" && /^-?\d{1,20}$/.test(v);
  const isCode = (v: unknown): v is string => typeof v === "string" && /^[A-Z]{3}$/.test(v);
  const wallets: FxWallet[] = [];
  for (const raw of body.wallets as unknown[]) {
    const w = raw as Record<string, unknown>;
    if (!isCode(w.currency) || !isMoney(w.total) || !Array.isArray(w.equivalents)) return null;
    const equivalents = (w.equivalents as Record<string, unknown>[]).filter(
      (e) => isCode(e.currency) && isMoney(e.amount) && typeof e.rate === "string",
    ) as unknown as FxWallet["equivalents"];
    wallets.push({ currency: w.currency, total: w.total, equivalents });
  }
  return {
    available: true,
    asOf: typeof body.asOf === "string" ? body.asOf : null,
    stale: body.stale === true,
    sample: body.sample === true,
    wallets,
  };
}
