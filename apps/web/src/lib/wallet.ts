import type { MoneyDto } from "./money-format";

export type Account = "available" | "locked" | "savings";

export type Wallet = Readonly<{
  currency: string;
  available: MoneyDto;
  locked: MoneyDto;
  savings: MoneyDto;
}>;

export type WalletTransaction = Readonly<{
  id: string;
  transactionId: string;
  /** What the API calls it ("funding", "reversal:funding"); never shown as it is. */
  type: string;
  account: Account;
  direction: "in" | "out";
  amount: MoneyDto;
  currency: string;
  createdAt: string;
}>;

const KNOWN: Readonly<Record<string, string>> = {
  funding: "Money added",
  withdrawal: "Withdrawal",
};
const REVERSAL = "reversal:";

/** Plain words for a ledger type; a type nobody has named yet still reads as a sentence. */
export function describeTransaction(type: string): string {
  if (type.startsWith(REVERSAL))
    return `${describeTransaction(type.slice(REVERSAL.length))}, reversed`;
  const known = KNOWN[type];
  if (known) return known;
  const words = type
    .split(/[\s_:-]+/)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words ? words[0]!.toUpperCase() + words.slice(1) : "Wallet activity";
}

const ACCOUNTS: Readonly<Record<Account, string>> = {
  available: "Available",
  locked: "Locked",
  savings: "Savings",
};

export const accountLabel = (account: Account): string => ACCOUNTS[account];

/** "NGN" -> "Nigerian Naira", for screen readers and headings; the code itself if it is not one. */
export function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}
