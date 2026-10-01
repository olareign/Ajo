/**
 * Money is always an integer in the currency's smallest unit (kobo, pence, cents),
 * paired with an ISO 4217 currency code. See docs/solution-architecture.md, decision 6.
 */
export type Money = Readonly<{ amount: number; currency: string }>;

export class InvalidAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAmountError";
  }
}

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Cannot combine ${a} with ${b}; convert through a quoted exchange first`);
    this.name = "CurrencyMismatchError";
  }
}

const CURRENCY_CODE = /^[A-Z]{3}$/;

function assertSafeInteger(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new InvalidAmountError(`${what} must be a safe integer, got ${value}`);
  }
}

export function money(amount: number, currency: string): Money {
  const code = currency.toUpperCase();
  if (!CURRENCY_CODE.test(code)) {
    throw new Error(`Invalid currency code: ${currency}`);
  }
  assertSafeInteger(amount, "Amount");
  return Object.freeze({ amount, currency: code });
}

export function minorUnitDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits as number;
}

const MAJOR_AMOUNT = /^(\d+)(?:\.(\d+))?$/;

/** Parses what a user typed (e.g. "10,000" or "12.50") into minor units, without floats. */
export function parseMajor(input: string, currency: string): Money {
  const cleaned = input.trim().replace(/,/g, "");
  const match = MAJOR_AMOUNT.exec(cleaned);
  if (!match) {
    throw new InvalidAmountError(`Not a valid amount: "${input}"`);
  }
  const digits = minorUnitDigits(currency);
  const whole = match[1] as string;
  const fraction = match[2] ?? "";
  if (fraction.length > digits) {
    throw new InvalidAmountError(`${currency} allows at most ${digits} decimal places`);
  }
  const minor = Number(whole + fraction.padEnd(digits, "0"));
  return money(minor, currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function multiply(m: Money, factor: number): Money {
  assertSafeInteger(factor, "Factor");
  return money(m.amount * factor, m.currency);
}

export function isZero(m: Money): boolean {
  return m.amount === 0;
}

/** Percentage in basis points (100 bps = 1%), rounded half up to the nearest minor unit. */
export function applyBasisPoints(m: Money, basisPoints: number): Money {
  assertSafeInteger(basisPoints, "Basis points");
  if (basisPoints < 0) {
    throw new InvalidAmountError("Basis points cannot be negative");
  }
  return money(Math.floor((m.amount * basisPoints + 5_000) / 10_000), m.currency);
}

/** Splits an amount by ratios; leftover minor units go to the first parts, so nothing is lost. */
export function allocate(m: Money, ratios: readonly number[]): Money[] {
  const total = ratios.reduce((sum, r) => sum + r, 0);
  if (ratios.length === 0 || total <= 0 || ratios.some((r) => r < 0)) {
    throw new Error("Ratios must be non-negative with a positive total");
  }
  const parts = ratios.map((r) => Math.floor((m.amount * r) / total));
  let remainder = m.amount - parts.reduce((sum, p) => sum + p, 0);
  for (let i = 0; remainder > 0; i++, remainder--) {
    parts[i % parts.length]! += 1;
  }
  return parts.map((p) => money(p, m.currency));
}

function toMajor(m: Money): number {
  return m.amount / 10 ** minorUnitDigits(m.currency);
}

/** Display only. Hides decimals when there are none, matching the designs ("₦70,000"). */
export function formatMoney(m: Money, locale: string): string {
  const digits = minorUnitDigits(m.currency);
  const hasMinor = m.amount % 10 ** digits !== 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: hasMinor ? digits : 0,
    maximumFractionDigits: digits,
  }).format(toMajor(m));
}

/** Short form for cards and chips ("₦10K"). Display only. */
export function formatMoneyCompact(m: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(toMajor(m));
}
