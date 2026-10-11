"use client";

import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Amount } from "@/components/ui/Amount";
import { monthLabel, type InsightMonth } from "@/lib/insights";
import { useWide } from "@/lib/use-wide";
import { describeTransaction, type WalletTransaction } from "@/lib/wallet";
import { loadInsights, loadTransactions } from "@/lib/wallet-client";
import { whenText } from "@/lib/when";

type Month = InsightMonth | "none" | "failed" | undefined;

/**
 * "This month" on a desk, like a bank's weekly summary: what's in your wallet now, and how much came
 * in and went out this month. With `recent`, the latest few payments follow, with a way to see
 * them all. It only exists on a wide screen and asks for its own data there, so a phone never does.
 */
export function MonthPanel({
  currency,
  recent = false,
}: Readonly<{ currency: string | undefined; recent?: boolean }>) {
  const wide = useWide();
  const [month, setMonth] = useState<Month>();
  const [items, setItems] = useState<readonly WalletTransaction[] | "failed">();

  useEffect(() => {
    if (!wide || !currency) return;
    let live = true;
    void loadInsights(1).then((result) => {
      if (!live) return;
      if (result.status !== "ok") return setMonth("failed");
      setMonth(result.data.find((m) => m.currency === currency) ?? "none");
    });
    if (recent) {
      void loadTransactions().then((result) => {
        if (live) setItems(result.status === "ok" ? result.data.items.slice(0, 4) : "failed");
      });
    }
    return () => {
      live = false;
    };
  }, [wide, currency, recent]);

  if (!wide || !currency) return null;
  return (
    <section
      aria-labelledby="this-month"
      className="grid gap-5 rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <h2 id="this-month" className="font-display text-[20px] leading-7 font-bold">
            This month
          </h2>
          <p className="text-[13px] text-ink-muted">
            {month && typeof month === "object"
              ? `${monthLabel(month.month, true)} summary`
              : "Summary"}
          </p>
        </div>
        <Link
          href="/insights"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[14px] font-semibold text-primary hover:bg-primary-tint"
        >
          Insights
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>

      {month === undefined && (
        <div role="status" className="h-12 animate-pulse rounded-m bg-surface-sunken">
          <span className="sr-only">Loading…</span>
        </div>
      )}
      {month === "failed" && (
        <p className="text-[14px] text-ink-muted">This month&apos;s summary couldn&apos;t load.</p>
      )}
      {month === "none" && (
        <p className="text-[14px] text-ink-muted">Nothing has moved this month yet.</p>
      )}
      {month && typeof month === "object" && (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="grid gap-0.5">
            <span className="text-[13px] text-ink-muted">In your wallet</span>
            <Amount amount={month.endAvailable} currency={currency} size="l" />
          </div>
          <dl className="flex gap-5 text-[14px]">
            <div className="flex items-center gap-1.5">
              <ArrowUp aria-hidden className="size-4 text-leaf" />
              <dt className="sr-only">Money in</dt>
              <dd className="font-semibold">
                <Amount amount={month.moneyIn} currency={currency} size="s" />
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDown aria-hidden className="size-4 text-ink-muted" />
              <dt className="sr-only">Money out</dt>
              <dd className="font-semibold">
                <Amount amount={month.moneyOut} currency={currency} size="s" />
              </dd>
            </div>
          </dl>
        </div>
      )}

      {recent && (
        <div className="grid gap-1 border-t border-line pt-4">
          <h3 className="text-[13px] font-semibold text-ink-muted">Latest payments</h3>
          {items === undefined && (
            <div aria-hidden className="h-32 animate-pulse rounded-m bg-surface-sunken" />
          )}
          {items === "failed" && (
            <p className="text-[14px] text-ink-muted">Your latest payments couldn&apos;t load.</p>
          )}
          {Array.isArray(items) && items.length === 0 && (
            <p className="text-[14px] text-ink-muted">No payments yet.</p>
          )}
          {Array.isArray(items) && items.length > 0 && (
            <ul aria-label="Latest payments" className="grid">
              {items.map((item) => (
                <CompactRow key={item.id} item={item} />
              ))}
            </ul>
          )}
          <Link
            href="/wallet"
            className="mt-1 inline-flex items-center gap-1 justify-self-center rounded-full px-3 py-1.5 text-[14px] font-semibold text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            See all
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

function CompactRow({ item }: Readonly<{ item: WalletTransaction }>) {
  const incoming = item.direction === "in";
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-[12px] ${incoming ? "bg-leaf-tint text-leaf" : "bg-surface-sunken text-ink-muted"}`}
      >
        {incoming ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
      </span>
      <div className="min-w-0 grow">
        <p className="truncate text-[15px] font-semibold">{describeTransaction(item.type)}</p>
        <p className="text-[13px] text-ink-muted">
          <time dateTime={item.createdAt}>{whenText(item.createdAt)}</time>
        </p>
      </div>
      <p className="shrink-0">
        <span className="sr-only">{incoming ? "Money in" : "Money out"} </span>
        <Amount
          amount={incoming ? item.amount.amount : `-${item.amount.amount}`}
          currency={item.amount.currency}
          size="s"
          className={incoming ? "text-leaf" : undefined}
        />
      </p>
    </li>
  );
}
