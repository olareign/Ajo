/**
 * Calendar dates ("YYYY-MM-DD") with no time or zone. Schedules are planned as local
 * calendar dates in the group's (or user's) time zone and only turned into instants
 * when a job runs (docs/solution-architecture.md, decision 10).
 */
export type CalendarDate = string;

export type Frequency = "daily" | "weekly" | "monthly";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtc(date: CalendarDate): Date {
  const match = ISO_DATE.exec(date);
  if (match) {
    const [, y, m, d] = match.map(Number) as [number, number, number, number];
    const utc = new Date(Date.UTC(y, m - 1, d));
    if (utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d) {
      return utc;
    }
  }
  throw new Error(`Invalid calendar date: "${date}"`);
}

function fromUtc(utc: Date): CalendarDate {
  return utc.toISOString().slice(0, 10);
}

export function parseDate(input: string): CalendarDate {
  return fromUtc(toUtc(input));
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const utc = toUtc(date);
  utc.setUTCDate(utc.getUTCDate() + days);
  return fromUtc(utc);
}

export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const utc = toUtc(date);
  const day = utc.getUTCDate();
  const target = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUtc(target);
}

export function addInterval(date: CalendarDate, frequency: Frequency, count: number): CalendarDate {
  switch (frequency) {
    case "daily":
      return addDays(date, count);
    case "weekly":
      return addDays(date, 7 * count);
    case "monthly":
      return addMonths(date, count);
  }
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return toUtc(a).getTime() - toUtc(b).getTime();
}
