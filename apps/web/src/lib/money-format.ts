/**
 * Display-only money formatting. The API is the source of truth for money and sends
 * amounts as strings of integer minor units (kobo, pence, cents) with an ISO 4217 code,
 * so values beyond 2^53 stay exact and no floating point is ever involved.
 */
export type MoneyDto = Readonly<{ amount: string; currency: string }>;

export class MoneyFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyFormatError";
  }
}

const INTEGER = /^-?\d+$/;
const CURRENCY = /^[A-Z]{3}$/;

function minorDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits as number;
}

/** "−10050" in GBP -> "-100.50": an exact decimal string Intl can format without rounding. */
function toDecimalString({ amount, currency }: MoneyDto): { decimal: string; hasMinor: boolean } {
  if (!INTEGER.test(amount)) throw new MoneyFormatError(`Amount must be an integer string`);
  if (!CURRENCY.test(currency)) throw new MoneyFormatError(`Invalid currency code`);
  const digits = minorDigits(currency);
  const negative = amount.startsWith("-");
  const abs = (negative ? amount.slice(1) : amount).padStart(digits + 1, "0");
  const whole = abs.slice(0, abs.length - digits);
  const fraction = abs.slice(abs.length - digits);
  return {
    decimal: `${negative ? "-" : ""}${whole}${digits > 0 ? `.${fraction}` : ""}`,
    hasMinor: /[1-9]/.test(fraction),
  };
}

// Intl accepts exact decimal strings (Intl.NumberFormat v3); the DOM typings lag behind.
type Formattable = Parameters<Intl.NumberFormat["format"]>[0];

export function formatMoney(money: MoneyDto, locale: string): string {
  const { decimal, hasMinor } = toDecimalString(money);
  const digits = minorDigits(money.currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: hasMinor ? digits : 0,
    maximumFractionDigits: digits,
  }).format(decimal as unknown as Formattable);
}

export function formatMoneyCompact(money: MoneyDto, locale: string): string {
  const { decimal } = toDecimalString(money);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(decimal as unknown as Formattable);
}
