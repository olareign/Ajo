export type InsightMonth = Readonly<{
  month: string;
  currency: string;
  moneyIn: string;
  moneyOut: string;
  savedNet: string;
  endAvailable: string;
  endSavings: string;
  endLocked: string;
}>;

const MONEY = /^-?\d{1,20}$/;

/** Reads the API's months, keeping only rows that look right. */
export function readInsights(body: unknown): InsightMonth[] | null {
  const months = (body as { months?: unknown } | null)?.months;
  if (!Array.isArray(months)) return null;
  return months.filter(
    (m): m is InsightMonth =>
      !!m &&
      typeof m.month === "string" &&
      /^\d{4}-\d{2}$/.test(m.month) &&
      typeof m.currency === "string" &&
      [m.moneyIn, m.moneyOut, m.savedNet, m.endAvailable, m.endSavings, m.endLocked].every(
        (v) => typeof v === "string" && MONEY.test(v),
      ),
  );
}

/** Minor units as a number of major units, for drawing only (labels use the exact string). */
export const major = (minor: string) => Number(minor) / 100;

/** A round top for an axis and its ticks: 0, then steps of 1, 2 or 5 × a power of ten. */
export function niceTicks(max: number, count = 4): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] };
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { top, ticks };
}

/** "2026-09" → "Sep", or "Sep 2026" when asked. */
export function monthLabel(month: string, withYear = false): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
