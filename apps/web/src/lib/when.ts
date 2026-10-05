/**
 * When something happened, exactly, in the person's own time zone and 12-hour time:
 * "Today, 2:45 PM", "Yesterday, 9:10 AM", "Tomorrow, 9:00 AM", "3 Oct, 6:02 PM", "3 Oct 2025, 6:02 PM".
 * Exact times matter for money records and disputes, so nothing reads as "5 min ago".
 */
export function whenText(iso: string, now: Date = new Date(), timeZone?: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(at);
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(d);
  const yesterday = new Date(now.getTime() - 86_400_000);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (day(at) === day(now)) return `Today, ${time}`;
  if (day(at) === day(yesterday)) return `Yesterday, ${time}`;
  if (day(at) === day(tomorrow)) return `Tomorrow, ${time}`;
  const sameYear = day(at).slice(0, 4) === day(now).slice(0, 4);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone,
  }).format(at);
  return `${date}, ${time}`;
}
