import type { Frequency } from "./savings-client";

/*
 * The days of a plan, for screens that have to show them before anything is saved (and for the
 * preview, which never calls the server). The server works the real ones out again when the plan is
 * made, and is the authority: this file only has to agree with it.
 */

export const MAX_DEBITS: Readonly<Record<Frequency, number>> = {
  daily: 366,
  weekly: 104,
  monthly: 60,
};

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number): string {
  const [y, m, day] = date.split("-").map(Number) as [number, number, number];
  const index = m - 1 + months;
  const year = y + Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

/** Counted from the start each time, so a short month does not drag the later ones. */
export function scheduleDates(start: string, frequency: Frequency, count: number): string[] {
  return Array.from({ length: count }, (_, n) =>
    frequency === "daily"
      ? addDays(start, n)
      : frequency === "weekly"
        ? addDays(start, 7 * n)
        : addMonths(start, n),
  );
}

/** Today where the person is, as YYYY-MM-DD. */
export function todayIn(currency: string, now: Date = new Date()): string {
  const zone = currency === "GBP" ? "Europe/London" : "Africa/Lagos";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "Sun 8 Nov": a day, read by a person. */
export function dayText(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function longDayText(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

export const FREQUENCY_WORD: Readonly<Record<Frequency, string>> = {
  daily: "every day",
  weekly: "every week",
  monthly: "every month",
};
