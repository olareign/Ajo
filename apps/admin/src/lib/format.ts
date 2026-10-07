/** An exact date and time in the reader's own zone, 12-hour: "7 Oct 2026, 2:45 PM". */
export function when(value: string | Date | null | undefined): string {
  if (!value) return "–";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "–";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
}

const SYMBOL: Record<string, string> = { NGN: "₦", GBP: "£" };

/** Minor units (kobo, pence) as money: "₦25,000.00". */
export function money(minor: string, currency: string): string {
  const negative = minor.startsWith("-");
  const digits = minor.replace("-", "").padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${SYMBOL[currency] ?? `${currency} `}${whole}.${digits.slice(-2)}`;
}

/** "written_off" → "Written off". */
export const words = (value: string) => {
  const spaced = value.replaceAll("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
