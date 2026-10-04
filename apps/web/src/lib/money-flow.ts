import type { Country } from "./kyc-config";

/** Whole naira or pounds typed on a keypad, as the integer string of kobo or pence the API deals in. */
export function toMinor(whole: string): string {
  return (BigInt(whole === "" ? "0" : whole) * 100n).toString();
}

export type FundMethod = Readonly<{
  value: "card" | "transfer" | "ussd" | "direct_debit";
  title: string;
  detail: string;
}>;

export const FUND_METHODS: Readonly<Record<Country, readonly FundMethod[]>> = {
  NG: [
    { value: "card", title: "Debit card", detail: "Pay with a Nigerian bank card" },
    {
      value: "transfer",
      title: "Bank transfer",
      detail: "Send from your bank app to your own Àjọ account number",
    },
    {
      value: "ussd",
      title: "USSD",
      detail: "Pay from any phone with your bank's code, no data needed",
    },
  ],
  GB: [
    {
      value: "transfer",
      title: "Bank transfer",
      detail: "Faster Payments from your bank app to your own Àjọ account",
    },
    {
      value: "direct_debit",
      title: "Direct Debit",
      detail: "We collect it from your bank, protected by the Direct Debit Guarantee",
    },
  ],
};

/** In whole naira or pounds. */
export const QUICK_AMOUNTS: Readonly<Record<Country, readonly number[]>> = {
  NG: [5_000, 10_000, 20_000, 50_000],
  GB: [20, 50, 100, 250],
};

export type TierLimits = Readonly<{
  tier: 0 | 1 | 2;
  title: string;
  unlocks: string;
  /** In whole naira or pounds. Sample numbers: the real ones are set before launch. */
  perTransaction: number;
  daily: number;
}>;

const LADDERS: Readonly<Record<Country, readonly TierLimits[]>> = {
  NG: [
    {
      tier: 0,
      title: "Not verified",
      unlocks: "You can look around, but no money moves",
      perTransaction: 0,
      daily: 0,
    },
    {
      tier: 1,
      title: "Passport stamped",
      unlocks: "Add money, save, join circles and withdraw",
      perTransaction: 100_000,
      daily: 300_000,
    },
    {
      tier: 2,
      title: "BVN added",
      unlocks: "Much higher limits, for bigger circles",
      perTransaction: 500_000,
      daily: 2_000_000,
    },
  ],
  GB: [
    {
      tier: 0,
      title: "Not verified",
      unlocks: "You can look around, but no money moves",
      perTransaction: 0,
      daily: 0,
    },
    {
      tier: 1,
      title: "Passport stamped",
      unlocks: "Add money, save, join circles and withdraw",
      perTransaction: 500,
      daily: 1_000,
    },
  ],
};

export const limitsFor = (country: Country): readonly TierLimits[] => LADDERS[country];

export const mandateCopy = (country: Country) =>
  country === "NG"
    ? {
        scheme: "NIBSS Direct Debit",
        how: "Your bank confirms a small verification transfer from your account. After that we can collect each saving or circle payment on its date, and only for amounts you agreed to.",
        guarantee:
          "You can see every collection in your bank app, and cancel here at any time you're not committed to a plan.",
      }
    : {
        scheme: "Bacs Direct Debit",
        how: "You'll approve a Direct Debit with your bank. After that we can collect each saving or circle payment on its date, and only for amounts you agreed to.",
        guarantee:
          "It's covered by the Direct Debit Guarantee, and you can cancel here whenever you're not committed to a plan.",
      };

/** Sample outcomes for the withdrawal preview: an amount ending 666 is a bank refusal that is reversed. */
export function withdrawOutcome(whole: string): "arrived" | "reversed" {
  return whole.endsWith("666") ? "reversed" : "arrived";
}

/** The preview's made-up wallet and bank, so the screens have something to show. */
export const SAMPLE = {
  /** Whole naira or pounds. */
  balance: { NG: 45_000, GB: 180 } as Readonly<Record<Country, number>>,
  account: {
    NG: { bank: "GTBank", last4: "6789" },
    GB: { bank: "Monzo", last4: "5678" },
  } as Readonly<Record<Country, { bank: string; last4: string }>>,
  /** A made-up account number to send a bank transfer to; real ones come from the payment partner. */
  inbound: {
    NG: { bank: "Wema Bank", number: "7812345678" },
    GB: { bank: "Modulr", sortCode: "04-00-04", number: "12345678" },
  } as Readonly<Record<Country, { bank: string; number: string; sortCode?: string }>>,
} as const;
