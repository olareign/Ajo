import { addInterval, type CalendarDate } from "../calendar";

export type RoundPlan = Readonly<{
  number: number;
  collectionDate: CalendarDate;
  recipientId: string;
}>;

/** One round per member; round N pays spot N. Dates are in the group's time zone. */
export function planRounds(
  input: Readonly<{
    startDate: CalendarDate;
    frequency: "weekly" | "monthly";
    assignments: readonly { memberId: string; spot: number }[];
  }>,
): RoundPlan[] {
  const bySpot = new Map(input.assignments.map((a) => [a.spot, a.memberId]));
  const size = input.assignments.length;
  if (size === 0 || bySpot.size !== size) {
    throw new Error("Payout order must give each member a distinct spot");
  }
  return Array.from({ length: size }, (_, i) => {
    const recipientId = bySpot.get(i + 1);
    if (recipientId === undefined) {
      throw new Error(`Payout order is missing spot ${i + 1}`);
    }
    return {
      number: i + 1,
      collectionDate: addInterval(input.startDate, input.frequency, i),
      recipientId,
    };
  });
}

export function slotsRemaining(
  input: Readonly<{ size: number; memberCount: number }>,
): Readonly<{ remaining: number; size: number; full: boolean }> {
  const remaining = Math.max(0, input.size - input.memberCount);
  return { remaining, size: input.size, full: remaining === 0 };
}
