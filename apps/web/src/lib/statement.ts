import { accountLabel, describeTransaction, type Account } from "./wallet";

export type StatementLine = Readonly<{
  id: string;
  at: string;
  type: string;
  account: Account;
  direction: "in" | "out";
  amount: string;
  currency: string;
  reference: string | null;
}>;
export type StatementBalance = Readonly<{
  currency: string;
  opening: string;
  closing: string;
  moneyIn: string;
  moneyOut: string;
}>;
export type Statement = Readonly<{
  from: string;
  to: string;
  timeZone: string;
  balances: readonly StatementBalance[];
  lines: readonly StatementLine[];
  truncated: boolean;
}>;

/** A day as YYYY-MM-DD in a time zone. */
export const dayIn = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export type Preset = "this-month" | "last-month" | "last-3-months" | "this-year";

/** The first and last day of a preset range, ending no later than today. */
export function presetRange(preset: Preset, today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const first = (year: number, month: number) => {
    const d = new Date(Date.UTC(year, month - 1, 1));
    return d.toISOString().slice(0, 10);
  };
  const last = (year: number, month: number) =>
    new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  switch (preset) {
    case "this-month":
      return { from: first(y, m), to: today };
    case "last-month": {
      const month = m === 1 ? 12 : m - 1;
      const year = m === 1 ? y - 1 : y;
      return { from: first(year, month), to: last(year, month) };
    }
    case "last-3-months": {
      const start = new Date(Date.UTC(y, m - 3, 1));
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    case "this-year":
      return { from: `${y}-01-01`, to: today };
  }
}

/** Minor units as a plain decimal ("-1234.50"), exact, for a spreadsheet. */
export function decimal(minor: string): string {
  const negative = minor.startsWith("-");
  const digits = (negative ? minor.slice(1) : minor).padStart(3, "0");
  return `${negative ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

/**
 * One CSV cell. Quoted when it must be; and a cell that a spreadsheet would read as a formula
 * (starting with = + - @, a tab or a return) is prefixed with ' so opening the file cannot run anything.
 * Numbers we write ourselves are left as numbers.
 */
export function cell(value: string, number = false): string {
  let text = value;
  if (!number && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The statement as CSV, one row per line, with a header; amounts signed (money out is negative). */
export function statementCsv(statement: Statement): string {
  const rows = [
    ["Date", "Time", "Description", "Account", "Money in", "Money out", "Currency", "Reference"],
    ...statement.lines.map((l) => {
      const at = new Date(l.at);
      const date = dayIn(at, statement.timeZone);
      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: statement.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(at);
      const amount = decimal(l.amount);
      return [
        cell(date),
        cell(time),
        cell(describeTransaction(l.type)),
        cell(accountLabel(l.account)),
        l.direction === "in" ? cell(amount, true) : "",
        l.direction === "out" ? cell(amount, true) : "",
        cell(l.currency),
        cell(l.reference ?? ""),
      ];
    }),
  ];
  // A byte-order mark so spreadsheet apps read the naira sign and accented names correctly.
  return `﻿${rows.map((r) => r.join(",")).join("\r\n")}\r\n`;
}

/** Reads the API's answer, trusting nothing about its shape. */
export function readStatement(body: unknown): Statement | null {
  const b = body as Partial<Statement> | null;
  if (!b || !Array.isArray(b.lines) || !Array.isArray(b.balances) || typeof b.timeZone !== "string")
    return null;
  const money = (v: unknown) => typeof v === "string" && /^-?\d{1,20}$/.test(v);
  const lines = b.lines.filter(
    (l) =>
      l &&
      typeof l.id === "string" &&
      money(l.amount) &&
      (l.direction === "in" || l.direction === "out"),
  );
  return {
    from: String(b.from ?? ""),
    to: String(b.to ?? ""),
    timeZone: b.timeZone,
    balances: b.balances.filter((x) => x && money(x.opening) && money(x.closing)),
    lines,
    truncated: b.truncated === true,
  };
}
