"use client";

import { CalendarClock, ChevronRight, HandCoins, Orbit, PiggyBank, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Amount } from "@/components/ui/Amount";
import { ratioOf } from "@/components/savings/SavingsHome";
import { loadGroup, type GroupDetail, type GroupSummary } from "@/lib/groups-client";
import type { Plan } from "@/lib/savings-client";
import { dayText } from "@/lib/schedule";

const card =
  "grid content-start gap-5 rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-lift";

/** A panel's heading: what it is, and one quiet link to where it lives. */
function PanelHead({
  id,
  title,
  href,
  link,
}: Readonly<{ id: string; title: string; href: string; link: string }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="font-display text-[20px] leading-7 font-bold">
        {title}
      </h2>
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[14px] font-semibold text-primary hover:bg-primary-tint"
      >
        {link}
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

/** One quiet line and a single way to begin, for a panel with nothing in it yet. */
function Empty({ text, href, action }: Readonly<{ text: string; href: string; action: string }>) {
  return (
    <div className="grid justify-items-start gap-3 rounded-[var(--radius-l)] bg-surface-sunken p-5">
      <p className="text-[15px] leading-6 text-ink-muted">{text}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary hover:underline"
      >
        <Plus aria-hidden className="size-4" />
        {action}
      </Link>
    </div>
  );
}

const going = (groups: readonly GroupSummary[] | null | undefined) =>
  (groups ?? []).filter((g) => ["open", "picking", "running"].includes(g.status));
const openPlans = (plans: readonly Plan[] | null | undefined) =>
  (plans ?? []).filter((p) => p.status === "active" || p.status === "paused");

type Due = Readonly<{
  key: string;
  date: string;
  title: string;
  detail: string;
  href: string;
  amount: Readonly<{ amount: string; currency: string }>;
  kind: "out" | "in";
}>;

/**
 * What happens next with your money, soonest first: saving payments, circle payments, and the day
 * a circle pays you. Dates come from the API (a plan's next debit; a running circle's rounds), so
 * nothing here is a guess. A running circle's rounds are asked for here (at most four).
 */
export function UpNext({
  plans,
  groups,
}: Readonly<{
  plans: readonly Plan[] | null | undefined;
  groups: readonly GroupSummary[] | null | undefined;
}>) {
  const running = going(groups)
    .filter((g) => g.status === "running")
    .slice(0, 4);
  const ids = running.map((g) => g.id).join(",");
  const [details, setDetails] = useState<readonly GroupDetail[]>([]);

  useEffect(() => {
    if (!ids) return;
    let live = true;
    void Promise.all(ids.split(",").map((id) => loadGroup(id))).then((results) => {
      if (live) setDetails(results.flatMap((r) => (r.ok ? [r.data] : [])));
    });
    return () => {
      live = false;
    };
  }, [ids]);

  const items: Due[] = [];
  for (const p of openPlans(plans)) {
    if (!p.nextDebit) continue;
    items.push({
      key: `plan-${p.id}`,
      date: p.nextDebit.dueOn,
      title: p.name,
      detail: "Saving payment",
      href: `/save/${p.id}`,
      amount: p.nextDebit.amount,
      kind: "out",
    });
  }
  for (const g of details) {
    if (g.nextDue) {
      items.push({
        key: `pay-${g.id}`,
        date: g.nextDue.dueOn,
        title: g.name,
        detail: `Round ${g.nextDue.roundNo} payment`,
        href: `/circles/${g.id}`,
        amount: { amount: g.contribution, currency: g.currency },
        kind: "out",
      });
    }
    const mine = g.rounds.find((r) => r.isYours && r.status === "scheduled");
    if (mine) {
      items.push({
        key: `payout-${g.id}`,
        date: mine.dueOn,
        title: g.name,
        detail: `Round ${mine.roundNo}: the pot is yours`,
        href: `/circles/${g.id}`,
        amount: { amount: g.pot, currency: g.currency },
        kind: "in",
      });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section aria-labelledby="up-next" className={card}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-tertiary-tint text-tertiary">
          <CalendarClock aria-hidden className="size-5" />
        </span>
        <h2 id="up-next" className="font-display text-[20px] leading-7 font-bold">
          Up next
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-[15px] leading-6 text-ink-muted">
          Nothing is due. Saving payments, circle payments and the day a circle pays you appear
          here, soonest first.
        </p>
      ) : (
        <ol className="grid">
          {items.slice(0, 5).map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex items-center gap-4 rounded-[14px] px-2 py-3 hover:bg-surface-sunken"
              >
                <span className="grid w-12 shrink-0 justify-items-center rounded-[12px] bg-surface-sunken py-1.5 text-center">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase">
                    {dayText(item.date).split(" ")[2] ?? ""}
                  </span>
                  <span className="font-display text-[18px] leading-6 font-bold">
                    {dayText(item.date).split(" ")[1] ?? ""}
                  </span>
                </span>
                <span className="grid min-w-0 grow">
                  <span className="truncate text-[15px] font-semibold">{item.title}</span>
                  <span className="text-[13px] text-ink-muted">
                    {item.detail} · {dayText(item.date).split(" ")[0]}
                  </span>
                </span>
                <span className={item.kind === "in" ? "shrink-0 text-leaf" : "shrink-0"}>
                  <span className="sr-only">{item.kind === "in" ? "You receive" : "You pay"} </span>
                  <Amount
                    amount={item.amount.amount}
                    currency={item.amount.currency}
                    size="s"
                    className={item.kind === "in" ? "text-leaf" : undefined}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Each pot on its own line with how full it is, instead of one total. */
export function SavingsPanel({ plans }: Readonly<{ plans: readonly Plan[] | null | undefined }>) {
  if (!plans) return null;
  const open = openPlans(plans);
  return (
    <section aria-labelledby="desk-savings" className={card}>
      <PanelHead id="desk-savings" title="Your pots" href="/save" link="All plans" />
      {open.length === 0 ? (
        <Empty
          text="Put money aside for something: rent, school fees, a trip home."
          href="/save/new"
          action="Start a plan"
        />
      ) : (
        <ul className="grid gap-4">
          {open.slice(0, 4).map((p) => {
            const ratio = ratioOf(p);
            return (
              <li key={p.id}>
                <Link
                  href={`/save/${p.id}`}
                  className="grid gap-2 rounded-[14px] p-2 hover:bg-surface-sunken"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf-tint text-leaf">
                      <PiggyBank aria-hidden className="size-5" />
                    </span>
                    <span className="grid min-w-0 grow">
                      <span className="truncate text-[15px] font-semibold">{p.name}</span>
                      <span className="text-[13px] text-ink-muted">
                        {p.status === "paused"
                          ? "Paused"
                          : `${p.paidDebits} of ${p.totalDebits} payments`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Amount amount={p.saved.amount} currency={p.saved.currency} size="s" />
                      <span className="block text-[12px] text-ink-muted">
                        of <Amount amount={p.target.amount} currency={p.target.currency} size="s" />
                      </span>
                    </span>
                  </span>
                  <span
                    role="progressbar"
                    aria-label={`${p.name}: ${Math.round(ratio * 100)}% saved`}
                    aria-valuenow={Math.round(ratio * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 overflow-hidden rounded-full bg-line"
                  >
                    <span
                      className="block h-full rounded-full bg-leaf"
                      style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 3 : 0)}%` }}
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const STATUS: Record<string, string> = {
  open: "Filling up",
  picking: "Picking turns",
  running: "Running",
};

/** Each circle you're in: how full it is, its pot, and your turn. */
export function CirclesPanel({
  groups,
}: Readonly<{ groups: readonly GroupSummary[] | null | undefined }>) {
  if (!groups) return null;
  const mine = going(groups);
  return (
    <section aria-labelledby="desk-circles" className={card}>
      <PanelHead id="desk-circles" title="Your circles" href="/circles" link="All circles" />
      {mine.length === 0 ? (
        <Empty
          text="Save together with people you trust: everyone pays in, one person takes the pot each round."
          href="/circles/new"
          action="Start a circle"
        />
      ) : (
        <ul className="grid gap-2">
          {mine.slice(0, 4).map((g) => (
            <li key={g.id}>
              <Link
                href={`/circles/${g.id}`}
                className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-surface-sunken"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tertiary-tint text-tertiary">
                  <Orbit aria-hidden className="size-5" />
                </span>
                <span className="grid min-w-0 grow">
                  <span className="truncate text-[15px] font-semibold">{g.name}</span>
                  <span className="text-[13px] text-ink-muted">
                    {STATUS[g.status]} · {g.memberCount} of {g.size} people
                    {g.mySpot ? ` · your turn: ${g.mySpot}` : ""}
                  </span>
                </span>
                <span className="grid shrink-0 justify-items-end">
                  <span className="text-[12px] text-ink-muted">Pot</span>
                  <Amount amount={g.pot} currency={g.currency} size="s" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A to-do that needs the person (identity, second lock): one slim line, only when it applies. */
export function Todo({
  href,
  Icon = HandCoins,
  tone,
  title,
  children,
}: Readonly<{
  href: string;
  Icon?: typeof HandCoins;
  tone: string;
  title: string;
  children: ReactNode;
}>) {
  return (
    <Link href={href} className={`flex items-center gap-4 rounded-[var(--radius-l)] p-4 ${tone}`}>
      <Icon aria-hidden className="size-6 shrink-0" />
      <span className="grid min-w-0">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[14px] leading-5 opacity-90">{children}</span>
      </span>
      <ChevronRight aria-hidden className="ml-auto size-5 shrink-0" />
    </Link>
  );
}
