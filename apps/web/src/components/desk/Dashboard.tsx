"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  BookUser,
  ChevronRight,
  Download,
  FileText,
  Landmark,
  Orbit,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { Me } from "@/components/onboarding/MeGate";
import { InOutChart } from "@/components/reports/Charts";
import { Amount } from "@/components/ui/Amount";
import { Pager } from "@/components/ui/Pager";
import { BalanceEye, HiddenAmount, SIGN } from "@/components/wallet/BalanceEye";
import { Equivalents } from "@/components/wallet/Equivalents";
import type { FxEquivalents } from "@/lib/fx";
import { cn } from "@/lib/cn";
import { useHiddenBalance } from "@/lib/hidden-balance";
import { monthLabel, type InsightMonth } from "@/lib/insights";
import { formatMoney } from "@/lib/money-format";
import { limitsFor } from "@/lib/money-flow";
import { loadNotices, type Notice, type Plan } from "@/lib/savings-client";
import { dayText } from "@/lib/schedule";
import { usePaged } from "@/lib/paging";
import { cell, decimal } from "@/lib/statement";
import {
  accountLabel,
  describeTransaction,
  type Wallet,
  type WalletTransaction,
} from "@/lib/wallet";
import { loadInsights, loadTransactions } from "@/lib/wallet-client";
import { whenText } from "@/lib/when";
import { card, openPlans, PanelHead, type Due } from "./TodayDesk";

/** A figure that follows the balance's eye, so hiding the balance hides it too. */
function Figure({
  amount,
  currency,
  className,
  size = "l",
  tone,
}: Readonly<{
  amount: string;
  currency: string;
  className?: string;
  size?: "s" | "m" | "l";
  tone?: "hero";
}>) {
  const [hidden] = useHiddenBalance();
  return hidden ? (
    <HiddenAmount sign={SIGN[currency] ?? currency} className={className} />
  ) : (
    <Amount amount={amount} currency={currency} size={size} {...(tone ? { tone } : {})} />
  );
}

/**
 * The balance on a tablet or a desk: what is available (with its eye and its worth in other
 * currencies), what is saved in pots and the next payment as two chips, and the two money moves
 * with a line each on where the money comes from and goes.
 */
export function BalanceHero({
  wallets,
  currency,
  fx,
  plans,
  upcoming,
}: Readonly<{
  wallets: readonly Wallet[] | null | undefined;
  currency: string | undefined;
  fx: FxEquivalents | null | undefined;
  plans: readonly Plan[] | null | undefined;
  upcoming: readonly Due[];
}>) {
  const [hidden, toggle] = useHiddenBalance();
  const cur = currency ?? wallets?.[0]?.currency ?? "NGN";
  const wallet = wallets?.find((w) => w.currency === cur) ?? wallets?.[0];
  const open = openPlans(plans);
  const inPots = open
    .filter((p) => p.saved.currency === cur)
    .reduce((n, p) => n + BigInt(p.saved.amount), 0n)
    .toString();
  const next = upcoming[0];
  const chip =
    "flex min-h-9 items-center gap-2 rounded-full bg-[var(--hero-chip)] px-3.5 text-[13px] text-on-hero hover:bg-white/20";

  return (
    <section
      aria-label="Your balance"
      className="hero-card grid content-between gap-5 rounded-[var(--radius-xl)] p-6 shadow-lift lg:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <Link href="/wallet" className="grid min-w-0 gap-1 rounded-m">
          <span className="flex items-center gap-1 text-[14px] text-on-hero-muted">
            Wallet balance
            <ChevronRight aria-hidden className="size-4" />
          </span>
          {wallets === undefined && (
            <span className="h-12 w-52 animate-pulse rounded-m bg-[var(--hero-chip)]">
              <span className="sr-only">Loading…</span>
            </span>
          )}
          {wallets === null && (
            <span className="text-on-hero-muted">Open your wallet to see it</span>
          )}
          {wallets && (
            <span className="font-display text-[40px] leading-[46px] font-bold tracking-[-0.02em]">
              {hidden ? (
                <HiddenAmount sign={SIGN[cur] ?? cur} />
              ) : (
                <Amount
                  amount={wallet?.available.amount ?? "0"}
                  currency={cur}
                  size="l"
                  tone="hero"
                />
              )}
            </span>
          )}
          <span className="text-[13px] text-on-hero-muted">Available</span>
        </Link>
        <BalanceEye hidden={hidden} onToggle={toggle} />
      </div>
      {wallet && <Equivalents fx={fx} currency={wallet.currency} hidden={hidden} />}
      <div className="flex flex-wrap gap-2">
        <Link href="/save" className={chip}>
          <span className="text-on-hero-muted">In pots</span>
          <span className="font-semibold">
            <Figure amount={inPots} currency={cur} size="s" tone="hero" />
          </span>
        </Link>
        <Link href={next?.href ?? "/save"} className={chip}>
          <span className="text-on-hero-muted">Next payment</span>
          {next ? (
            <span className="font-semibold">
              <span className="sr-only">{next.kind === "in" ? "You receive" : "You pay"} </span>
              <Figure
                amount={next.amount.amount}
                currency={next.amount.currency}
                size="s"
                tone="hero"
              />{" "}
              · {dayText(next.date)}
            </span>
          ) : (
            <span className="font-semibold">Nothing due</span>
          )}
        </Link>
      </div>
      <nav
        aria-label="Move money"
        className="grid grid-cols-1 gap-2 rounded-[22px] bg-black/20 p-2 sm:grid-cols-2"
      >
        <Link
          href="/wallet/add"
          className="flex min-h-16 items-center gap-3 rounded-[16px] bg-oro p-3 text-on-oro transition-[filter] hover:brightness-95"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-black/10">
            <ArrowDownToLine aria-hidden className="size-5" />
          </span>
          <span className="grid">
            <span className="text-[16px] font-semibold">Add money</span>
            <span className="text-[12px]">From your bank or card</span>
          </span>
        </Link>
        <Link
          href="/wallet/withdraw"
          className="flex min-h-16 items-center gap-3 rounded-[16px] bg-white/10 p-3 text-on-hero transition-colors hover:bg-white/15"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--hero-chip)]">
            <ArrowUpFromLine aria-hidden className="size-5" />
          </span>
          <span className="grid">
            <span className="text-[16px] font-semibold">Withdraw</span>
            <span className="text-[12px] text-on-hero-muted">To your bank account</span>
          </span>
        </Link>
      </nav>
    </section>
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

/** One of the chart's summary figures, with the series colour when it has one. */
function Tile({
  label,
  dot,
  children,
}: Readonly<{ label: string; dot?: string; children: ReactNode }>) {
  return (
    <div className="grid content-start gap-1 rounded-[16px] bg-surface-sunken px-4 py-3.5">
      <dt className="flex items-center gap-2 text-[13px] text-ink-muted">
        {dot && <span aria-hidden className={cn("size-2.5 rounded-[3px]", dot)} />}
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

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
  const kept = BigInt(total("moneyIn")) - BigInt(total("moneyOut"));
  const busiest = shown.reduce<InsightMonth | undefined>((best, m) => {
    const size = BigInt(m.moneyIn) + BigInt(m.moneyOut);
    return !best || size > BigInt(best.moneyIn) + BigInt(best.moneyOut) ? m : best;
  }, undefined);
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
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Money in" dot="bg-[var(--chart-in)]">
              <Amount amount={total("moneyIn")} currency={cur} size="m" />
            </Tile>
            <Tile label="Money out" dot="bg-[var(--chart-out)]">
              <Amount amount={total("moneyOut")} currency={cur} size="m" />
            </Tile>
            <Tile label="Kept">
              <span className={kept >= 0n ? "text-leaf" : undefined}>
                <Amount amount={kept.toString()} currency={cur} size="m" />
              </span>
            </Tile>
            <Tile label="Busiest month">
              <span className="font-display text-[20px] leading-7 font-bold">
                {busiest ? monthLabel(busiest.month, true) : "–"}
              </span>
            </Tile>
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

/** Where the account stands, in one slim line: identity level, the second lock, devices. */
export function AccountStrip({ me }: Readonly<{ me: Me }>) {
  const ladder = me.country === "NG" || me.country === "GB" ? limitsFor(me.country) : null;
  const tier = me.kycTier ?? 0;
  const rung = ladder?.find((r) => r.tier === tier) ?? ladder?.[0];
  const pill = (good: boolean) =>
    cn(
      "rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
      good ? "bg-leaf-tint text-leaf" : "bg-oro-tint text-oro-ink",
    );
  return (
    <section
      aria-labelledby="account-security"
      className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[var(--radius-xl)] bg-surface-raised px-6 py-4 shadow-lift lg:px-7"
    >
      <h2 id="account-security" className="font-display text-[17px] font-bold">
        Account and security
      </h2>
      <Link href="/wallet/limits" className="flex items-center gap-2.5 text-[15px] hover:underline">
        Identity level<span className={pill(tier > 0)}>{rung ? rung.title : "Not verified"}</span>
      </Link>
      <Link href="/me/security" className="flex items-center gap-2.5 text-[15px] hover:underline">
        Authenticator app
        <span className={pill(Boolean(me.mfaEnabled))}>{me.mfaEnabled ? "On" : "Off"}</span>
      </Link>
      <Link href="/me/devices" className="flex items-center gap-2.5 text-[15px] hover:underline">
        Devices and sign-ins<span className={pill(true)}>Review</span>
      </Link>
      <Link
        href="/settings"
        className="ml-auto text-[14px] font-semibold text-primary hover:underline"
      >
        Manage
      </Link>
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

const RANGES = [
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "3m", label: "Last 3 months", days: 92 },
  { value: "12m", label: "Last 12 months", days: 366 },
  { value: "all", label: "All time", days: null },
] as const;
type Range = (typeof RANGES)[number]["value"];
type Direction = "" | "in" | "out";
type AccountFilter = "" | WalletTransaction["account"];

export type HistoryFilter = Readonly<{
  text: string;
  direction: Direction;
  account: AccountFilter;
  range: Range;
}>;
const ANY: HistoryFilter = { text: "", direction: "", account: "", range: "30d" };

/** The payments that match: words in the description or reference, money in or out, which account, how recent. */
export function filterHistory(
  items: readonly WalletTransaction[],
  f: HistoryFilter,
  now: number,
): readonly WalletTransaction[] {
  const words = f.text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const days = RANGES.find((r) => r.value === f.range)?.days ?? null;
  const since = days === null ? -Infinity : now - days * 86_400_000;
  return items.filter((t) => {
    if (f.direction && t.direction !== f.direction) return false;
    if (f.account && t.account !== f.account) return false;
    if (Date.parse(t.createdAt) < since) return false;
    if (words.length === 0) return true;
    const said =
      `${describeTransaction(t.type)} ${t.transactionId} ${accountLabel(t.account)}`.toLowerCase();
    return words.every((w) => said.includes(w));
  });
}

/** The payments shown, as a spreadsheet: one row each, money out negative. */
export function historyCsv(items: readonly WalletTransaction[]): string {
  const rows = [
    ["Date", "Time", "Description", "Reference", "Account", "Type", "Amount", "Currency"],
  ];
  for (const t of items) {
    const at = new Date(t.createdAt);
    rows.push([
      at.toISOString().slice(0, 10),
      at.toISOString().slice(11, 16),
      describeTransaction(t.type),
      t.transactionId,
      accountLabel(t.account),
      t.direction === "in" ? "Money in" : "Money out",
      decimal(t.direction === "in" ? t.amount.amount : `-${t.amount.amount}`),
      t.amount.currency,
    ]);
  }
  return rows.map((r) => r.map((v, i) => cell(v, i === 6)).join(",")).join("\r\n") + "\r\n";
}

const field =
  "min-h-11 rounded-[12px] border border-line-strong bg-surface px-3 text-[14px] text-ink";

/**
 * Every payment in and out of the wallet, as a table you can narrow: words, money in or out,
 * which account and how far back. What is chosen shows as chips that undo themselves; the pager
 * fetches older payments from the API as you go; the spreadsheet holds exactly what is shown.
 * Ledger lines are always settled, so there is no status column to show.
 */
export function TransactionHistory() {
  const [items, setItems] = useState<readonly WalletTransaction[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [filter, setFilter] = useState<HistoryFilter>(ANY);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    void loadTransactions().then((r) => {
      if (!live) return;
      if (r.status !== "ok") return setState("failed");
      setItems(r.data.items);
      setNext(r.data.next);
      setState("ready");
    });
    return () => {
      live = false;
    };
  }, []);

  async function more() {
    if (!next) return;
    const r = await loadTransactions(next);
    if (r.status !== "ok") return;
    setItems((was) => [...was, ...r.data.items]);
    setNext(r.data.next);
  }

  const shown = filterHistory(items, filter, now);
  const paged = usePaged(shown);
  const set = (patch: Partial<HistoryFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const chips: { label: string; clear: Partial<HistoryFilter> }[] = [];
  if (filter.text.trim()) chips.push({ label: `“${filter.text.trim()}”`, clear: { text: "" } });
  if (filter.direction)
    chips.push({
      label: filter.direction === "in" ? "Money in" : "Money out",
      clear: { direction: "" },
    });
  if (filter.account) chips.push({ label: accountLabel(filter.account), clear: { account: "" } });
  if (filter.range !== "all")
    chips.push({
      label: RANGES.find((r) => r.value === filter.range)!.label,
      clear: { range: "all" },
    });

  function download() {
    const url = URL.createObjectURL(
      new Blob([historyCsv(shown)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ajo-transactions-${new Date(now).toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section
      aria-labelledby="history"
      className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6 pb-4 lg:px-7">
        <div className="grid gap-0.5">
          <h2 id="history" className="font-display text-[20px] leading-7 font-bold">
            Transaction history
          </h2>
          <p className="text-[14px] text-ink-muted">Every payment in and out of your wallet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/wallet/statements"
            className="flex min-h-11 items-center rounded-[12px] px-3 text-[14px] font-semibold text-primary hover:underline"
          >
            Statements
          </Link>
          <button
            type="button"
            disabled={shown.length === 0}
            onClick={download}
            className="flex min-h-11 items-center gap-2 rounded-[12px] border-[1.5px] border-primary px-4 text-[14px] font-semibold text-primary disabled:opacity-50"
          >
            <Download aria-hidden className="size-4" />
            Download CSV
          </button>
        </div>
      </div>

      <search
        role="search"
        aria-label="Filter transactions"
        className="grid gap-3 border-y border-line bg-surface-sunken px-6 py-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] lg:px-7"
      >
        <label className="grid gap-1.5 text-[13px] font-semibold sm:col-span-2 lg:col-span-1">
          Search
          <span className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={filter.text}
              onChange={(e) => set({ text: e.target.value })}
              placeholder="Description or reference"
              className={cn(field, "w-full pl-9 font-normal")}
            />
          </span>
        </label>
        <label className="grid gap-1.5 text-[13px] font-semibold">
          Type
          <select
            value={filter.direction}
            onChange={(e) => set({ direction: e.target.value as Direction })}
            className={cn(field, "font-normal")}
          >
            <option value="">All</option>
            <option value="in">Money in</option>
            <option value="out">Money out</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-[13px] font-semibold">
          Account
          <select
            value={filter.account}
            onChange={(e) => set({ account: e.target.value as AccountFilter })}
            className={cn(field, "font-normal")}
          >
            <option value="">All accounts</option>
            <option value="available">{accountLabel("available")}</option>
            <option value="locked">{accountLabel("locked")}</option>
            <option value="savings">{accountLabel("savings")}</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-[13px] font-semibold">
          Date
          <select
            value={filter.range}
            onChange={(e) => set({ range: e.target.value as Range })}
            className={cn(field, "font-normal")}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </search>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-6 pt-4 lg:px-7">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => set(c.clear)}
              aria-label={`Remove filter: ${c.label}`}
              className="flex min-h-9 items-center gap-1.5 rounded-full bg-primary-tint px-3 text-[13px] font-semibold text-primary"
            >
              {c.label}
              <X aria-hidden className="size-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilter({ ...ANY, range: "all" })}
            className="min-h-9 px-2 text-[13px] font-semibold text-ink-muted hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}

      {state === "loading" && (
        <div role="status" className="m-6 h-48 animate-pulse rounded-m bg-surface-sunken">
          <span className="sr-only">Loading…</span>
        </div>
      )}
      {state === "failed" && (
        <p role="alert" className="px-6 py-6 text-[14px] text-ink-muted lg:px-7">
          Your transactions couldn&apos;t load. Open your wallet to try again.
        </p>
      )}
      {state === "ready" && items.length === 0 && (
        <p className="m-6 rounded-[var(--radius-l)] bg-surface-sunken p-5 text-[15px] text-ink-muted">
          No payments yet. When you add money, it shows here.
        </p>
      )}
      {state === "ready" && items.length > 0 && shown.length === 0 && (
        <div className="m-6 grid justify-items-start gap-3 rounded-[var(--radius-l)] bg-surface-sunken p-5">
          <p className="text-[15px] text-ink-muted">No payments match these filters.</p>
          <button
            type="button"
            onClick={() => setFilter({ ...ANY, range: "all" })}
            className="text-[14px] font-semibold text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
      {paged.slice.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[14px]">
            <caption className="sr-only">Transaction history</caption>
            <thead>
              <tr className="text-[12px] tracking-[0.04em] text-ink-muted uppercase">
                <th
                  scope="col"
                  className="border-b border-line py-3 pr-3 pl-6 font-semibold lg:pl-7"
                >
                  Date
                </th>
                <th scope="col" className="border-b border-line px-3 py-3 font-semibold">
                  Description
                </th>
                <th
                  scope="col"
                  className="hidden border-b border-line px-3 py-3 font-semibold lg:table-cell"
                >
                  Reference
                </th>
                <th
                  scope="col"
                  className="hidden border-b border-line px-3 py-3 font-semibold lg:table-cell"
                >
                  Account
                </th>
                <th scope="col" className="border-b border-line px-3 py-3 font-semibold">
                  Type
                </th>
                <th
                  scope="col"
                  className="border-b border-line py-3 pr-6 pl-3 text-right font-semibold lg:pr-7"
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.slice.map((t) => {
                const incoming = t.direction === "in";
                return (
                  <tr key={t.id} className="hover:bg-surface-sunken">
                    <td className="border-b border-line py-3.5 pr-3 pl-6 whitespace-nowrap text-ink-muted lg:pl-7">
                      <time dateTime={t.createdAt}>{dateTime(t.createdAt)}</time>
                    </td>
                    <td className="border-b border-line px-3 py-3.5 font-medium">
                      {describeTransaction(t.type)}
                    </td>
                    <td
                      className="hidden border-b border-line px-3 py-3.5 font-mono text-[12px] text-ink-muted lg:table-cell"
                      title={t.transactionId}
                    >
                      {t.transactionId.slice(0, 8)}
                    </td>
                    <td className="hidden border-b border-line px-3 py-3.5 text-ink-muted lg:table-cell">
                      {accountLabel(t.account)}
                    </td>
                    <td className="border-b border-line px-3 py-3.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap",
                          incoming ? "bg-leaf-tint text-leaf" : "bg-tertiary-tint text-tertiary",
                        )}
                      >
                        {incoming ? "Money in" : "Money out"}
                      </span>
                    </td>
                    <td className="border-b border-line py-3.5 pr-6 pl-3 text-right whitespace-nowrap lg:pr-7">
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
        </div>
      )}
      {state === "ready" && items.length > 0 && (
        <Pager
          paged={paged}
          noun={["payment", "payments"]}
          more={{ has: next !== null, load: more }}
        />
      )}
    </section>
  );
}
