"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Amount } from "@/components/ui/Amount";
import { dayText } from "@/lib/schedule";
import { loadNotices, loadPlans, type Plan } from "@/lib/savings-client";
import { Pot } from "./Pot";
import { ratioOf } from "./SavingsHome";

/**
 * Today's glance at saving. It waits for its turn (`go`) so Today's calls to the server go one after
 * another, and it also learns how many messages are unread, for the bell. Both are optional: if either
 * cannot be had, Today simply shows less.
 */
export function TodaySavings({
  go,
  onUnread,
  onDone,
}: Readonly<{ go: boolean; onUnread: (count: number) => void; onDone?: () => void }>) {
  const router = useRouter();
  const [plans, setPlans] = useState<readonly Plan[]>();

  useEffect(() => {
    if (!go) return;
    let live = true;
    (async () => {
      const result = await loadPlans();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") router.replace("/sign-in");
        return onDone?.();
      }
      setPlans(result.data);
      const notices = await loadNotices();
      if (live && notices.ok) onUnread(notices.data.unread);
      if (live) onDone?.();
    })();
    return () => {
      live = false;
    };
  }, [go, router, onUnread, onDone]);

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
