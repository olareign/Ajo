import { compareDates, type CalendarDate } from "../calendar";
import { applyBasisPoints, money, multiply, subtract, type Money } from "../money";

/**
 * Èsúsú group rules (docs/product-spec.md, "Èsúsú group rules"). Values marked as
 * proposals in the spec live here so they can change in one place once decided.
 */
export type GroupRules = Readonly<{
  /** Share of spots reserved for trusted members (proposed: 30%). */
  earlySpotPercent: number;
  /** Deposit for an untrusted member, in rounds of contribution (proposed: 1). */
  untrustedDepositRounds: number;
  /** Deposit for an untrusted member who takes an early spot (spec: "a larger deposit"). */
  earlySpotDepositRounds: number;
  minGroupSize: number;
  /** The Private Group Setup design caps "No of People" at 12. */
  maxGroupSize: number;
}>;

export const DEFAULT_RULES: GroupRules = Object.freeze({
  earlySpotPercent: 30,
  untrustedDepositRounds: 1,
  earlySpotDepositRounds: 2,
  minGroupSize: 2,
  maxGroupSize: 12,
});

export function earlySpotCount(size: number, rules: GroupRules = DEFAULT_RULES): number {
  return Math.max(1, Math.floor((size * rules.earlySpotPercent) / 100));
}

export function requiredDeposit(
  input: Readonly<{ contribution: Money; trusted: boolean; earlySpot: boolean }>,
  rules: GroupRules = DEFAULT_RULES,
): Money {
  if (input.trusted) {
    return money(0, input.contribution.currency);
  }
  const rounds = input.earlySpot ? rules.earlySpotDepositRounds : rules.untrustedDepositRounds;
  return multiply(input.contribution, rounds);
}

export type RoundPayout = Readonly<{ gross: Money; fee: Money; net: Money }>;

/** The pot for one round, less the payout fee (the fee itself is still an open question). */
export function roundPayout(
  input: Readonly<{ contribution: Money; size: number; feeBasisPoints: number }>,
): RoundPayout {
  const gross = multiply(input.contribution, input.size);
  const fee = applyBasisPoints(gross, input.feeBasisPoints);
  return { gross, fee, net: subtract(gross, fee) };
}

export type GroupSetupProblem =
  "name_required" | "contribution_positive" | "size_out_of_range" | "start_date_past";

export function validateGroupSetup(
  input: Readonly<{
    name: string;
    contribution: Money;
    size: number;
    startDate: CalendarDate;
    today: CalendarDate;
  }>,
  rules: GroupRules = DEFAULT_RULES,
): GroupSetupProblem[] {
  const problems: GroupSetupProblem[] = [];
  if (input.name.trim() === "") problems.push("name_required");
  if (input.contribution.amount <= 0) problems.push("contribution_positive");
  if (
    !Number.isInteger(input.size) ||
    input.size < rules.minGroupSize ||
    input.size > rules.maxGroupSize
  ) {
    problems.push("size_out_of_range");
  }
  if (compareDates(input.startDate, input.today) < 0) problems.push("start_date_past");
  return problems;
}
