import { Check, Clock, Coins, Shield, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Status = "paid" | "pending" | "late" | "covered" | "yourTurn";

const STATUS: Record<Status, { word: string; Icon: LucideIcon; tone: string }> = {
  paid: { word: "Paid", Icon: Check, tone: "bg-leaf-tint text-leaf" },
  pending: { word: "Pending", Icon: Clock, tone: "bg-surface-sunken text-ink-muted" },
  late: { word: "Late", Icon: TriangleAlert, tone: "bg-danger-tint text-danger" },
  covered: { word: "Covered", Icon: Shield, tone: "bg-tertiary-tint text-tertiary" },
  yourTurn: { word: "Your turn", Icon: Coins, tone: "bg-oro text-on-oro" },
};

/** A status is always a word, an icon and a colour, so it reads without colour vision. */
export function StatusPill({
  status,
  children,
}: Readonly<{ status: Status; children?: ReactNode }>) {
  const { word, Icon, tone } = STATUS[status];
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex min-h-[26px] items-center gap-1 whitespace-nowrap rounded-full py-0 pr-2 pl-1.5 text-xs font-semibold",
        tone,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2} />
      {children ?? word}
    </span>
  );
}
