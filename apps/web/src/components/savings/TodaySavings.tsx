"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/ui/Amount";
import { dayText } from "@/lib/schedule";
import type { Plan } from "@/lib/savings-client";
import { Pot } from "./Pot";
import { ratioOf } from "./SavingsHome";

/** Today's glance at saving. Nothing at all when plans cannot be had (say, before the passport). */
export function TodaySavings({ plans }: Readonly<{ plans: readonly Plan[] | null | undefined }>) {
  if (!plans) return null;
  const open = plans.filter((p) => p.status === "active" || p.status === "paused");
  const next = open
    .filter((p) => p.nextDebit)
    .sort((a, b) => a.nextDebit!.dueOn.localeCompare(b.nextDebit!.dueOn))[0];
  const currency = open[0]?.saved.currency;
  const saved = open
    .filter((p) => p.saved.currency === currency)
    .reduce((n, p) => n + BigInt(p.saved.amount), 0n);

  return (
    <Link
      href="/save"
      className="mt-4 flex items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
    >
      <Pot
        ratio={open.length ? Math.max(...open.map(ratioOf)) : 0}
        size={56}
        label="Your savings pot"
      />
      <span className="grid min-w-0 gap-0.5">
        <span className="text-[13px] font-semibold tracking-[0.01em] text-tertiary">Savings</span>
        {open.length === 0 ? (
          <>
            <span className="text-[15px] font-semibold">Fill your first pot</span>
            <span className="text-[14px] leading-5 text-ink-muted">
              Pick a goal and save a little at a time.
            </span>
          </>
        ) : (
          <>
            <Amount amount={saved.toString()} currency={currency!} size="m" />
            <span className="text-[14px] leading-5 text-ink-muted">
              in {open.length} {open.length === 1 ? "pot" : "pots"}
              {next?.nextDebit && ` · next ${dayText(next.nextDebit.dueOn)}`}
            </span>
          </>
        )}
      </span>
      <ChevronRight aria-hidden className="ml-auto size-5 shrink-0 text-ink-muted" />
    </Link>
  );
}
