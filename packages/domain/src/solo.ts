import {
  addDays,
  addInterval,
  addMonths,
  compareDates,
  type CalendarDate,
  type Frequency,
} from "./calendar";
import { CurrencyMismatchError, multiply, type Money } from "./money";

export type Duration = Readonly<{ unit: "days" | "weeks" | "months"; count: number }>;

export type SoloPlanInput = Readonly<{
  amount: Money;
  frequency: Frequency;
  duration: Duration;
  startDate: CalendarDate;
}>;

export type SoloPlanSchedule = Readonly<{
  debitDates: readonly CalendarDate[];
  depositCount: number;
  maturityDate: CalendarDate;
  /** What the user will have at maturity. No interest (product spec: non-interest only). */
  total: Money;
}>;

function endOf(start: CalendarDate, duration: Duration): CalendarDate {
  switch (duration.unit) {
    case "days":
      return addDays(start, duration.count);
    case "weeks":
      return addDays(start, duration.count * 7);
    case "months":
      return addMonths(start, duration.count);
  }
}

export function planSchedule(input: SoloPlanInput): SoloPlanSchedule {
  if (input.amount.amount <= 0) {
    throw new Error("Plan amount must be positive");
  }
  if (!Number.isInteger(input.duration.count) || input.duration.count <= 0) {
    throw new Error("Plan duration must be a positive whole number");
  }

  const maturityDate = endOf(input.startDate, input.duration);
  const debitDates: CalendarDate[] = [];
  // Each date is computed from the start, so month-end clamping never drifts.
  for (
    let i = 0, date = input.startDate;
    compareDates(date, maturityDate) < 0;
    date = addInterval(input.startDate, input.frequency, ++i)
  ) {
    debitDates.push(date);
  }

  return {
    debitDates,
    depositCount: debitDates.length,
    maturityDate,
    total: multiply(input.amount, debitDates.length),
  };
}

export function nextDebitDate(plan: SoloPlanSchedule, today: CalendarDate): CalendarDate | null {
  return plan.debitDates.find((d) => compareDates(d, today) >= 0) ?? null;
}

export function savedPercent(saved: Money, target: Money): number {
  if (saved.currency !== target.currency) {
    throw new CurrencyMismatchError(saved.currency, target.currency);
  }
  if (target.amount <= 0) {
    return 0;
  }
  return Math.min(100, Math.floor((saved.amount * 100) / target.amount));
}
