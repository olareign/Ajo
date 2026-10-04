import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { dayText } from "@/lib/schedule";
import type { DebitStatus } from "@/lib/savings-client";

type Bead = Readonly<{ seq: number; dueOn: string; status: DebitStatus }>;

const WORDS: Record<DebitStatus, string> = {
  scheduled: "coming",
  paid: "paid",
  failed: "missed",
  skipped: "skipped",
};

/**
 * A plan's debits as a string of beads, in order: gold and ticked when paid, hollow while coming (the
 * next one ringed), crossed in red when missed. The word is always in the label, so colour is never the
 * only way to tell them apart.
 */
export function Beads({ debits }: Readonly<{ debits: readonly Bead[] }>) {
  const nextSeq = debits.find((d) => d.status === "scheduled")?.seq;
  return (
    <ol aria-label="Debits" className="flex flex-wrap gap-2">
      {debits.map((d) => {
        const next = d.seq === nextSeq;
        return (
          <li
            key={d.seq}
            data-status={d.status}
            data-next={next ? "" : undefined}
            aria-label={`Debit ${d.seq}: ${WORDS[d.status]}${next ? ", next" : ""}, ${dayText(d.dueOn)}`}
            className={cn(
              "grid size-8 place-items-center rounded-full border-2 text-[11px] font-semibold",
              d.status === "paid" && "border-oro bg-oro text-on-oro",
              d.status === "scheduled" && "border-line-strong bg-surface-raised text-ink-muted",
              d.status === "failed" && "border-danger bg-danger-tint text-danger",
              d.status === "skipped" && "border-line bg-surface-sunken text-ink-muted",
              next && "ring-2 ring-primary ring-offset-2",
            )}
          >
            {d.status === "paid" ? (
              <Check aria-hidden className="size-4" strokeWidth={3} />
            ) : d.status === "failed" ? (
              <X aria-hidden className="size-4" strokeWidth={3} />
            ) : d.status === "skipped" ? (
              <Minus aria-hidden className="size-4" />
            ) : (
              <span aria-hidden>{d.seq}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
