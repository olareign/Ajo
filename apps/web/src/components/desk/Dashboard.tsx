"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BookUser,
  CalendarClock,
  ChevronRight,
  FileText,
  KeyRound,
  Landmark,
  Laptop,
  Orbit,
  PiggyBank,
  Plus,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { Me } from "@/components/onboarding/MeGate";
import { InOutChart } from "@/components/reports/Charts";
import { Amount } from "@/components/ui/Amount";
import { HiddenAmount, SIGN } from "@/components/wallet/BalanceEye";
import { cn } from "@/lib/cn";
import { useHiddenBalance } from "@/lib/hidden-balance";
import { monthLabel, type InsightMonth } from "@/lib/insights";
import { formatMoney } from "@/lib/money-format";
import { limitsFor } from "@/lib/money-flow";
import { loadNotices, type Notice, type Plan } from "@/lib/savings-client";
import { dayText } from "@/lib/schedule";
import { accountLabel, describeTransaction, type WalletTransaction } from "@/lib/wallet";
import { loadInsights, loadTransactions } from "@/lib/wallet-client";
import { whenText } from "@/lib/when";
import { card, openPlans, PanelHead, type Due } from "./TodayDesk";

/** The smaller summary cards beside the balance: a label, one figure, one line of context. */
function Summary({
  Icon,
  tone,
  label,
  href,
  children,
  note,
}: Readonly<{
  Icon: LucideIcon;
  tone: string;
  label: string;
  href: string;
  children: ReactNode;
  note: ReactNode;
}>) {
  return (
    <Link
      href={href}
      className="grid content-between gap-4 rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-lift transition-colors hover:bg-surface-sunken"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-medium text-ink-muted">{label}</span>
        <span className={cn("grid size-10 place-items-center rounded-full", tone)}>
          <Icon aria-hidden className="size-5" />
        </span>
      </span>
      <span className="grid gap-1">
        <span className="min-w-0 truncate">{children}</span>
        <span className="text-[13px] text-ink-muted">{note}</span>
      </span>
    </Link>
  );
}

/** A summary figure that follows the balance's eye, so hiding the balance hides these too. */
function Figure({ amount, currency }: Readonly<{ amount: string; currency: string }>) {
  const [hidden] = useHiddenBalance();
  return hidden ? (
    <HiddenAmount
      sign={SIGN[currency] ?? currency}
      className="font-display text-[28px] leading-9 font-bold tracking-[-0.02em]"
    />
  ) : (
    <Amount amount={amount} currency={currency} size="l" />
  );
}

/** What is saved in pots, in the wallet's currency, and how many plans are going. */
export function SavedCard({
  plans,
  currency,
}: Readonly<{ plans: readonly Plan[] | null | undefined; currency: string | undefined }>) {
  const open = openPlans(plans);
  const cur = currency ?? open[0]?.saved.currency ?? "NGN";
  const saved = open
    .filter((p) => p.saved.currency === cur)
    .reduce((n, p) => n + BigInt(p.saved.amount), 0n);
  return (
    <Summary
      Icon={PiggyBank}
      tone="bg-leaf-tint text-leaf"
      label="Saved in pots"
      href="/save"
      note={
        open.length === 0
          ? "No saving plan yet"
          : `${open.length} active ${open.length === 1 ? "plan" : "plans"}`
      }
    >
      <Figure amount={saved.toString()} currency={cur} />
    </Summary>
  );
}

/** The very next thing that moves money, from the same list as Up next. */
export function NextCard({ items }: Readonly<{ items: readonly Due[] }>) {
  const next = items[0];
  return (
    <Summary
      Icon={CalendarClock}
      tone="bg-tertiary-tint text-tertiary"
      label="Next payment"
      href={next?.href ?? "/save"}
      note={next ? `${next.title} · ${dayText(next.date)}` : "Nothing is due"}
    >
      {next ? (
        <span className={next.kind === "in" ? "text-leaf" : undefined}>
          <span className="sr-only">{next.kind === "in" ? "You receive" : "You pay"} </span>
          <Figure amount={next.amount.amount} currency={next.amount.currency} />
        </span>
      ) : (
        <span className="font-display text-[24px] font-bold text-ink-muted">–</span>
      )}
    </Summary>
  );
}

const ACTIONS = [
  { href: "/save/new", label: "Start a saving plan", Icon: Plus, primary: true },
  { href: "/circles/new", label: "Start a circle", Icon: Orbit },
  { href: "/wallet/mandate", label: "Set up auto-debit", Icon: Landmark },
  { href: "/wallet/statements", label: "See statements", Icon: FileText },
] as const;

/** Four things people start from here; adding and withdrawing money live on the balance card. */
export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ACTIONS.map(({ href, label, Icon, ...rest }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-[var(--radius-l)] px-4 text-[15px] font-semibold transition-[filter,background-color]",
            "primary" in rest
              ? "bg-primary text-on-primary hover:brightness-110"
              : "bg-surface-raised text-ink shadow-lift hover:bg-surface-sunken",
          )}
        >
          <Icon aria-hidden className="size-5 shrink-0" />
          {label}
          <ChevronRight aria-hidden className="ml-auto size-4 shrink-0 opacity-70" />
        </Link>
      ))}
    </nav>
  );
}

const PERIODS = [
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "12 months" },
] as const;

type Load = "loading" | "failed" | readonly InsightMonth[];

/**
 * Money in and out by month, with a choice of period that reloads the chart and the totals under
 * it. The API keeps months per currency; this shows the wallet's own.
 */
export function ActivityChart({
  currency,
  locale,
}: Readonly<{ currency: string | undefined; locale: string }>) {
  const [months, setMonths] = useState<(typeof PERIODS)[number]["months"]>(6);
  const [data, setData] = useState<Load>("loading");

  useEffect(() => {
    let live = true;
    void loadInsights(months).then((result) => {
      if (live) setData(result.status === "ok" ? result.data : "failed");
    });
    return () => {
      live = false;
    };
  }, [months]);

  const shown = Array.isArray(data)
    ? data.filter((m) => m.currency === (currency ?? data[0]?.currency))
    : [];
  const total = (key: "moneyIn" | "moneyOut") =>
    shown.reduce((n, m) => n + BigInt(m[key]), 0n).toString();
  const cur = shown[0]?.currency ?? currency ?? "NGN";
  const empty = Array.isArray(data) && shown.every((m) => m.moneyIn === "0" && m.moneyOut === "0");

  return (
    <section aria-labelledby="activity-chart" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="activity-chart" className="font-display text-[20px] leading-7 font-bold">
          Money in and out
        </h2>
        <div
          role="radiogroup"
          aria-label="Period"
          className="flex rounded-full bg-surface-sunken p-1"
        >
          {PERIODS.map((p) => (
            <button
              key={p.months}
              type="button"
              role="radio"
              aria-checked={months === p.months}
              onClick={() => {
                setData("loading");
                setMonths(p.months);
              }}
              className="min-h-9 rounded-full px-3 text-[13px] font-semibold text-ink-muted aria-checked:bg-surface-raised aria-checked:text-ink aria-checked:shadow-lift"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {data === "loading" && (
        <div role="status" className="h-64 animate-pulse rounded-m bg-surface-sunken">
          <span className="sr-only">Loading…</span>
        </div>
      )}
      {data === "failed" && (
        <p
          role="alert"
          className="grid h-64 place-items-center rounded-m bg-surface-sunken text-[14px] text-ink-muted"
        >
          The chart couldn&apos;t load. Try another period, or come back in a moment.
        </p>
      )}
      {Array.isArray(data) && empty && (
        <p className="grid h-64 place-items-center rounded-m bg-surface-sunken p-6 text-center text-[14px] text-ink-muted">
          No money has moved in this period yet. Top-ups, withdrawals and circle payments show here.
        </p>
      )}
      {Array.isArray(data) && !empty && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="grid gap-0.5">
              <dt className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                <ArrowDownLeft aria-hidden className="size-4 text-leaf" />
                Money in
              </dt>
              <dd>
                <Amount amount={total("moneyIn")} currency={cur} size="m" />
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                <ArrowUpRight aria-hidden className="size-4" />
                Money out
              </dt>
              <dd>
                <Amount amount={total("moneyOut")} currency={cur} size="m" />
              </dd>
            </div>
          </dl>
          <InOutChart months={shown} locale={locale} />
          {/* The same figures as a table, for screen readers. */}
          <table className="sr-only">
            <caption>Money in and out by month</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Money in</th>
                <th scope="col">Money out</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{monthLabel(m.month, true)}</th>
                  <td>{formatMoney({ amount: m.moneyIn, currency: m.currency }, locale)}</td>
                  <td>{formatMoney({ amount: m.moneyOut, currency: m.currency }, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

/**
 * Only what needs the person: an unfinished identity check, the second lock, and unread
 * notifications (the latest three). Nothing at all when everything is in order.
 */
export function Attention({ me }: Readonly<{ me: Me }>) {
  const [notices, setNotices] = useState<readonly Notice[] | "failed">();
  useEffect(() => {
    let live = true;
    void loadNotices().then((r) => {
      if (live) setNotices(r.ok ? r.data.items.filter((n) => !n.readAt).slice(0, 3) : "failed");
    });
    return () => {
      live = false;
    };
  }, []);

  const todos: { href: string; Icon: LucideIcon; title: string; body: string; tone: string }[] = [];
  if (me.kycStatus !== undefined && me.kycStatus !== "approved") {
    todos.push({
      href: "/verify",
      Icon: BookUser,
      title: "Get your passport stamped",
      body:
        me.kycStatus === "pending"
          ? "We're checking your details."
          : me.kycStatus === "rejected"
            ? "A stamp needs another try."
            : "Five short steps open saving, circles and friends.",
      tone: "bg-primary-tint text-primary",
    });
  }
  if (me.mfaEnabled === false) {
    todos.push({
      href: "/me/security",
      Icon: ShieldAlert,
      title: "Add a second lock",
      body: "Needed before you can move money.",
      tone: "bg-oro-tint text-oro-ink",
    });
  }
  const unread = Array.isArray(notices) ? notices : [];
  const clear = todos.length === 0 && unread.length === 0 && notices !== undefined;

  return (
    <section aria-labelledby="attention" className={card}>
      <PanelHead
        id="attention"
        title="Needs your attention"
        href="/notifications"
        link="All notifications"
      />
      {notices === undefined && todos.length === 0 && (
        <div aria-hidden className="h-24 animate-pulse rounded-m bg-surface-sunken" />
      )}
      {clear && (
        <p className="flex items-center gap-3 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] text-leaf">
          <ShieldCheck aria-hidden className="size-5 shrink-0" />
          You&apos;re all caught up.
        </p>
      )}
      {(todos.length > 0 || unread.length > 0) && (
        <ul className="grid gap-1">
          {todos.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-surface-sunken"
              >
                <span
                  className={cn("grid size-10 shrink-0 place-items-center rounded-full", t.tone)}
                >
                  <t.Icon aria-hidden className="size-5" />
                </span>
                <span className="grid min-w-0">
                  <span className="text-[15px] font-semibold">{t.title}</span>
                  <span className="text-[13px] text-ink-muted">{t.body}</span>
                </span>
                <ChevronRight aria-hidden className="ml-auto size-4 shrink-0 text-ink-muted" />
              </Link>
            </li>
          ))}
          {unread.map((n) => (
            <li key={n.id}>
              <Link
                href={n.link ?? "/notifications"}
                className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-surface-sunken"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-muted">
                  <Bell aria-hidden className="size-5" />
                </span>
                <span className="grid min-w-0">
                  <span className="truncate text-[15px] font-semibold">{n.title}</span>
                  <span className="truncate text-[13px] text-ink-muted">
                    {whenText(n.createdAt)}
                  </span>
                </span>
                <span className="sr-only">Unread</span>
                <span aria-hidden className="ml-auto size-2 shrink-0 rounded-full bg-oro" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {notices === "failed" && (
        <p className="text-[13px] text-ink-muted">Notifications couldn&apos;t load just now.</p>
      )}
    </section>
  );
}

/** Where the account stands: identity level, second lock, devices. Reassuring, not alarming. */
export function AccountCard({ me }: Readonly<{ me: Me }>) {
  const ladder = me.country === "NG" || me.country === "GB" ? limitsFor(me.country) : null;
  const tier = me.kycTier ?? 0;
  const rung = ladder?.find((r) => r.tier === tier) ?? ladder?.[0];
  const rows: { href: string; Icon: LucideIcon; label: string; value: string; good: boolean }[] = [
    {
      href: "/wallet/limits",
      Icon: BookUser,
      label: "Identity level",
      value: rung ? rung.title : "Not verified",
      good: tier > 0,
    },
    {
      href: "/me/security",
      Icon: KeyRound,
      label: "Authenticator app",
      value: me.mfaEnabled ? "On" : "Off",
      good: Boolean(me.mfaEnabled),
    },
    {
      href: "/me/devices",
      Icon: Laptop,
      label: "Devices and sign-ins",
      value: "Review",
      good: true,
    },
  ];
  return (
    <section aria-labelledby="account-security" className={card}>
      <PanelHead id="account-security" title="Account and security" href="/me" link="Me" />
      <ul className="grid gap-1">
        {rows.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-surface-sunken"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                <r.Icon aria-hidden className="size-5" />
              </span>
              <span className="grow text-[15px] font-medium">{r.label}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
                  r.good ? "bg-leaf-tint text-leaf" : "bg-oro-tint text-oro-ink",
                )}
              >
                {r.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

/**
 * The latest wallet payments: a table on a desk, a list on smaller screens. Only payments in or out
 * of the wallet itself (a deposit locked is one line, not both halves of an internal move).
 * Ledger lines are always settled, so there is no status column to show.
 */
export function RecentTransactions() {
  const [items, setItems] = useState<readonly WalletTransaction[] | "failed">();
  useEffect(() => {
    let live = true;
    void loadTransactions().then((r) => {
      if (live)
        setItems(
          r.status === "ok"
            ? r.data.items.filter((i) => i.account === "available").slice(0, 6)
            : "failed",
        );
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section aria-labelledby="recent-tx" className={card}>
      <PanelHead
        id="recent-tx"
        title="Recent transactions"
        href="/wallet/statements"
        link="All transactions"
      />
      {items === undefined && (
        <div aria-hidden className="h-48 animate-pulse rounded-m bg-surface-sunken" />
      )}
      {items === "failed" && (
        <p role="alert" className="text-[14px] text-ink-muted">
          Your transactions couldn&apos;t load. Open your wallet to try again.
        </p>
      )}
      {Array.isArray(items) && items.length === 0 && (
        <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-[15px] text-ink-muted">
          No payments yet. When you add money, it shows here.
        </p>
      )}
      {Array.isArray(items) && items.length > 0 && (
        <>
          <table className="hidden w-full border-collapse text-left text-[14px] md:table">
            <caption className="sr-only">Your latest wallet payments</caption>
            <thead>
              <tr className="text-[12px] tracking-[0.04em] text-ink-muted uppercase">
                <th className="border-b border-line py-2.5 pr-3 font-semibold">Description</th>
                <th className="border-b border-line px-3 py-2.5 font-semibold">Reference</th>
                <th className="border-b border-line px-3 py-2.5 font-semibold">Date</th>
                <th className="border-b border-line px-3 py-2.5 font-semibold">Type</th>
                <th className="border-b border-line py-2.5 pl-3 text-right font-semibold">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const incoming = t.direction === "in";
                return (
                  <tr key={t.id}>
                    <td className="border-b border-line py-3 pr-3">
                      <span className="flex items-center gap-3 font-medium">
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-full",
                            incoming
                              ? "bg-leaf-tint text-leaf"
                              : "bg-surface-sunken text-ink-muted",
                          )}
                        >
                          {incoming ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </span>
                        {describeTransaction(t.type)}
                      </span>
                    </td>
                    <td
                      className="border-b border-line px-3 py-3 font-mono text-[12px] text-ink-muted"
                      title={t.transactionId}
                    >
                      {t.transactionId.slice(0, 8)}
                    </td>
                    <td className="border-b border-line px-3 py-3 whitespace-nowrap text-ink-muted">
                      <time dateTime={t.createdAt}>{dateTime(t.createdAt)}</time>
                    </td>
                    <td className="border-b border-line px-3 py-3 text-ink-muted">
                      {incoming ? "Money in" : "Money out"}
                    </td>
                    <td className="border-b border-line py-3 pl-3 text-right whitespace-nowrap">
                      <Amount
                        amount={incoming ? t.amount.amount : `-${t.amount.amount}`}
                        currency={t.amount.currency}
                        size="s"
                        className={incoming ? "text-leaf" : undefined}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="grid md:hidden" aria-label="Your latest wallet payments">
            {items.map((t) => {
              const incoming = t.direction === "in";
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      incoming ? "bg-leaf-tint text-leaf" : "bg-surface-sunken text-ink-muted",
                    )}
                  >
                    {incoming ? (
                      <ArrowDownLeft className="size-5" />
                    ) : (
                      <ArrowUpRight className="size-5" />
                    )}
                  </span>
                  <span className="grid min-w-0 grow">
                    <span className="truncate text-[15px] font-semibold">
                      {describeTransaction(t.type)}
                    </span>
                    <span className="text-[13px] text-ink-muted">
                      {accountLabel(t.account)} ·{" "}
                      <time dateTime={t.createdAt}>{whenText(t.createdAt)}</time>
                    </span>
                  </span>
                  <span className="shrink-0">
                    <span className="sr-only">{incoming ? "Money in" : "Money out"} </span>
                    <Amount
                      amount={incoming ? t.amount.amount : `-${t.amount.amount}`}
                      currency={t.amount.currency}
                      size="s"
                      className={incoming ? "text-leaf" : undefined}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
