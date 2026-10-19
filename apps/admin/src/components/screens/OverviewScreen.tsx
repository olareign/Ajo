"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Clock,
  Globe2,
  Orbit,
  PiggyBank,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAdmin, useCan } from "@/components/AdminProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Failed, Loading } from "@/components/ui/Page";
import { get } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import { money, when, words } from "@/lib/format";
import type { Dashboard, Permission } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const panel =
  "grid content-start gap-4 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift";
const COUNTRY: Record<string, string> = {
  NG: "Nigeria",
  GB: "United Kingdom",
  unset: "Not chosen",
};

/** Whole currency units, short: ₦1.2M, £350K (en-US: browsers agree on capitals). Tables keep exact amounts. */
function short(minor: string, currency: string): string {
  const major = Number(minor) / 100;
  const symbol = currency === "NGN" ? "₦" : currency === "GBP" ? "£" : `${currency} `;
  return `${symbol}${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(major)}`;
}

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );

function Tile({
  Icon,
  tone,
  label,
  value,
  note,
  href,
}: Readonly<{
  Icon: LucideIcon;
  tone: string;
  label: string;
  value: ReactNode;
  note?: ReactNode;
  href?: string;
}>) {
  const body = (
    <>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tone)}>
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-[13px] text-ink-muted">{label}</span>
        <span className="truncate font-display text-[24px] leading-8 font-bold tabular-nums">
          {value}
        </span>
        {note && <span className="text-[12px] text-ink-muted">{note}</span>}
      </span>
    </>
  );
  const cls = "flex items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift";
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-surface-sunken")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * Money in and out per day for one currency: paired columns on a shared baseline, a legend, a
 * hover title per day, and the same figures as a table for screen readers.
 */
function FlowChart({ data, currency }: Readonly<{ data: Dashboard; currency: string }>) {
  const byDay = new Map(data.flow.filter((f) => f.currency === currency).map((f) => [f.day, f]));
  const days = data.people.signups.map((s) => s.day);
  const rows = days.map((day) => ({
    day,
    moneyIn: Number(byDay.get(day)?.moneyIn ?? 0),
    moneyOut: Number(byDay.get(day)?.moneyOut ?? 0),
  }));
  const max = Math.max(1, ...rows.flatMap((r) => [r.moneyIn, r.moneyOut]));
  const W = 600;
  const H = 180;
  const step = W / rows.length;
  const bar = Math.max(2, step / 2 - 2);
  const empty = rows.every((r) => r.moneyIn === 0 && r.moneyOut === 0);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-4 text-[13px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-chart-in" /> Money in
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-chart-out" /> Money out
        </span>
      </div>
      {empty ? (
        <p className="grid min-h-40 place-items-center rounded-m bg-surface-sunken p-6 text-center text-[14px] text-ink-muted">
          No payments in or out in the last {data.days} days.
        </p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-auto w-full" aria-hidden>
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={0}
              x2={W}
              y1={H - H * t}
              y2={H - H * t}
              className="stroke-chart-grid"
              strokeWidth={1}
            />
          ))}
          {rows.map((r, i) => (
            <g key={r.day}>
              <title>{`${dayLabel(r.day)}: in ${money(String(r.moneyIn), currency)}, out ${money(String(r.moneyOut), currency)}`}</title>
              <rect x={i * step} y={0} width={step} height={H} className="fill-transparent" />
              {r.moneyIn > 0 && (
                <rect
                  x={i * step + 1}
                  y={H - (r.moneyIn / max) * H}
                  width={bar}
                  height={(r.moneyIn / max) * H}
                  rx={2}
                  className="fill-chart-in"
                />
              )}
              {r.moneyOut > 0 && (
                <rect
                  x={i * step + 1 + bar + 2}
                  y={H - (r.moneyOut / max) * H}
                  width={bar}
                  height={(r.moneyOut / max) * H}
                  rx={2}
                  className="fill-chart-out"
                />
              )}
            </g>
          ))}
          {[0, Math.floor(rows.length / 2), rows.length - 1].map((i) => (
            <text
              key={i}
              x={Math.min(i * step, W - 40)}
              y={H + 14}
              className="fill-ink-muted text-[11px]"
            >
              {dayLabel(rows[i]!.day)}
            </text>
          ))}
        </svg>
      )}
      <table className="sr-only">
        <caption>Money in and out by day, {currency}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>In</th>
            <th>Out</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => r.moneyIn || r.moneyOut)
            .map((r) => (
              <tr key={r.day}>
                <td>{dayLabel(r.day)}</td>
                <td>{money(String(r.moneyIn), currency)}</td>
                <td>{money(String(r.moneyOut), currency)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/** New people per day: one series, so no legend; the title says what it is. */
function SignupChart({ data }: Readonly<{ data: Dashboard }>) {
  const rows = data.people.signups;
  const max = Math.max(1, ...rows.map((r) => r.count));
  const W = 300;
  const H = 90;
  const step = W / rows.length;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${data.people.joinedInPeriod} people joined in the last ${data.days} days`}
    >
      {rows.map((r, i) => (
        <g key={r.day}>
          <title>{`${dayLabel(r.day)}: ${r.count} joined`}</title>
          <rect x={i * step} y={0} width={step} height={H} className="fill-transparent" />
          <rect
            x={i * step + 1}
            y={H - Math.max((r.count / max) * H, r.count ? 3 : 1)}
            width={Math.max(2, step - 3)}
            height={Math.max((r.count / max) * H, r.count ? 3 : 1)}
            rx={2}
            className={r.count ? "fill-chart-in" : "fill-chart-grid"}
          />
        </g>
      ))}
    </svg>
  );
}

function Waiting({
  items,
}: Readonly<{
  items: readonly {
    label: string;
    count: number;
    href?: string;
    Icon: LucideIcon;
    urgent?: boolean;
  }[];
}>) {
  return (
    <ul className="grid divide-y divide-line">
      {items.map(({ label, count, href, Icon, urgent }) => {
        const row = (
          <>
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full",
                count > 0 && urgent
                  ? "bg-danger-tint text-danger"
                  : "bg-surface-sunken text-ink-muted",
              )}
            >
              <Icon aria-hidden className="size-[18px]" />
            </span>
            <span className="grow text-[14px] font-medium">{label}</span>
            <span className="font-display text-[18px] font-bold tabular-nums">{count}</span>
            {href && <ChevronRight aria-hidden className="size-4 text-ink-muted" />}
          </>
        );
        return (
          <li key={label}>
            {href ? (
              <Link href={href} className="flex items-center gap-3 py-3 hover:bg-surface-sunken">
                {row}
              </Link>
            ) : (
              <div className="flex items-center gap-3 py-3">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function OverviewScreen() {
  const me = useAdmin();
  const can = useCan();
  const { state, reload } = useLoad(() => get<Dashboard>("dashboard"));
  const [picked, setPicked] = useState<string>();
  const link = (href: string, needs: Permission) => (can(needs) ? href : undefined);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-display text-[26px] leading-8 font-bold tracking-[-0.01em]">
            Hello, {me.name.split(" ")[0]}
          </h1>
          <p className="text-[15px] text-ink-muted">
            Where things stand, and what is waiting on the team.
          </p>
        </div>
        {state.phase === "ready" && (
          <span className="rounded-full bg-surface-raised px-3 py-1.5 text-[13px] font-semibold text-ink-muted shadow-lift">
            Last {state.data.days} days
          </span>
        )}
      </header>
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" &&
        (() => {
          const d = state.data;
          const currencies = d.money.map((m) => m.currency);
          const currency =
            picked && currencies.includes(picked) ? picked : (currencies[0] ?? "NGN");
          const m = d.money.find((x) => x.currency === currency);
          const waiting =
            d.work.pendingKyc + d.work.openCases + d.work.failedPayments + d.work.stuckPayments;
          return (
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Tile
                  Icon={Users}
                  tone="bg-primary-tint text-primary"
                  label="People"
                  value={d.people.total.toLocaleString("en-GB")}
                  note={`+${d.people.joinedInPeriod} in ${d.days} days · ${d.people.suspended} suspended`}
                  href={link("/users", "users:read")}
                />
                <Tile
                  Icon={Wallet}
                  tone="bg-oro-tint text-oro-ink"
                  label={`Held for customers${m ? ` (${currency})` : ""}`}
                  value={m ? short(m.held, currency) : "–"}
                  note="Wallets, savings and deposits"
                />
                <Tile
                  Icon={ArrowDownLeft}
                  tone="bg-leaf-tint text-leaf"
                  label={`Money in (${currency})`}
                  value={m ? short(m.moneyIn, currency) : "–"}
                  note={m ? `Out: ${short(m.moneyOut, currency)}` : undefined}
                />
                <Tile
                  Icon={Orbit}
                  tone="bg-tertiary-tint text-tertiary"
                  label="Circles running"
                  value={d.circles.running}
                  note={`${d.circles.open + d.circles.picking} filling · ${d.circles.completed} finished`}
                />
              </div>

              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <section aria-labelledby="flow" className={panel}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="flow" className="font-display text-[18px] font-semibold">
                      Money in and out
                    </h2>
                    {currencies.length > 1 && (
                      <div role="radiogroup" aria-label="Currency" className="flex gap-1">
                        {currencies.map((c) => (
                          <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={c === currency}
                            onClick={() => setPicked(c)}
                            className="rounded-full px-3 py-1 text-[13px] font-semibold text-ink-muted aria-checked:bg-primary-tint aria-checked:text-primary"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <FlowChart data={d} currency={currency} />
                </section>

                <section aria-labelledby="waiting" className={panel}>
                  <div className="flex items-center justify-between">
                    <h2 id="waiting" className="font-display text-[18px] font-semibold">
                      Waiting on the team
                    </h2>
                    <Badge tone={waiting > 0 ? "warn" : "good"}>
                      {waiting > 0 ? `${waiting} to look at` : "All clear"}
                    </Badge>
                  </div>
                  <Waiting
                    items={[
                      {
                        label: "Identity checks",
                        count: d.work.pendingKyc,
                        href: link("/kyc", "kyc:read"),
                        Icon: ShieldCheck,
                      },
                      {
                        label: "Open recovery cases",
                        count: d.work.openCases,
                        href: link("/cases", "cases:read"),
                        Icon: ClipboardList,
                        urgent: true,
                      },
                      {
                        label: `Failed payments (${d.days} days)`,
                        count: d.work.failedPayments,
                        Icon: AlertTriangle,
                      },
                      {
                        label: "Payments stuck over a day",
                        count: d.work.stuckPayments,
                        Icon: Clock,
                        urgent: true,
                      },
                    ]}
                  />
                </section>
              </div>

              <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
                <section aria-labelledby="joined" className={panel}>
                  <div className="flex items-baseline justify-between">
                    <h2 id="joined" className="font-display text-[18px] font-semibold">
                      New people
                    </h2>
                    <span className="text-[13px] text-ink-muted">
                      {d.people.joinedInPeriod} in {d.days} days
                    </span>
                  </div>
                  <SignupChart data={d} />
                </section>

                <section aria-labelledby="where" className={panel}>
                  <h2
                    id="where"
                    className="flex items-center gap-2 font-display text-[18px] font-semibold"
                  >
                    <Globe2 aria-hidden className="size-5 text-primary" />
                    Where people are
                  </h2>
                  <ul className="grid gap-3">
                    {d.people.byCountry.map((c) => (
                      <li key={c.country} className="grid gap-1.5">
                        <span className="flex justify-between text-[14px]">
                          <span className="font-medium">{COUNTRY[c.country] ?? c.country}</span>
                          <span className="tabular-nums text-ink-muted">
                            {c.count} · {Math.round((c.count / Math.max(1, d.people.total)) * 100)}%
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className="h-2 overflow-hidden rounded-full bg-chart-grid"
                        >
                          <span
                            className="block h-full rounded-full bg-chart-in"
                            style={{ width: `${(c.count / Math.max(1, d.people.total)) * 100}%` }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section
                  aria-labelledby="products"
                  className={cn(panel, "md:col-span-2 xl:col-span-1")}
                >
                  <h2 id="products" className="font-display text-[18px] font-semibold">
                    Circles and plans
                  </h2>
                  <dl className="grid grid-cols-2 gap-3 text-[14px]">
                    {(
                      [
                        [Orbit, "Circles filling", d.circles.open + d.circles.picking],
                        [Orbit, "Circles running", d.circles.running],
                        [PiggyBank, "Plans saving", d.plans.active],
                        [PiggyBank, "Plans paused", d.plans.paused],
                      ] as const
                    ).map(([Icon, label, value]) => (
                      <div key={label} className="grid gap-1 rounded-m bg-surface-sunken p-3">
                        <dt className="flex items-center gap-1.5 text-ink-muted">
                          <Icon aria-hidden className="size-4" />
                          {label}
                        </dt>
                        <dd className="font-display text-[22px] font-bold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>

              <section aria-labelledby="recent" className={panel}>
                <h2 id="recent" className="font-display text-[18px] font-semibold">
                  Latest payments
                </h2>
                {d.recent.length === 0 ? (
                  <p className="text-[14px] text-ink-muted">No payments yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
                      <thead>
                        <tr className="text-[12px] tracking-[0.04em] text-ink-muted uppercase">
                          <th className="border-b border-line px-3 py-2.5 font-semibold">When</th>
                          <th className="border-b border-line px-3 py-2.5 font-semibold">Kind</th>
                          <th className="border-b border-line px-3 py-2.5 text-right font-semibold">
                            Amount
                          </th>
                          <th className="border-b border-line px-3 py-2.5 font-semibold">Status</th>
                          <th className="border-b border-line px-3 py-2.5">
                            <span className="sr-only">Person</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.recent.map((r) => (
                          <tr key={r.id}>
                            <td className="border-b border-line px-3 py-2.5 whitespace-nowrap text-ink-muted">
                              {when(r.createdAt)}
                            </td>
                            <td className="border-b border-line px-3 py-2.5">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                {r.kind === "funding" ? (
                                  <ArrowDownLeft aria-hidden className="size-4 text-leaf" />
                                ) : (
                                  <ArrowUpRight aria-hidden className="size-4 text-ink-muted" />
                                )}
                                {r.kind === "funding" ? "Money in" : "Withdrawal"}
                              </span>
                            </td>
                            <td className="border-b border-line px-3 py-2.5 text-right tabular-nums">
                              {money(r.amount, r.currency)}
                            </td>
                            <td className="border-b border-line px-3 py-2.5">
                              <Badge tone={statusTone(r.status)}>{words(r.status)}</Badge>
                            </td>
                            <td className="border-b border-line px-3 py-2.5 text-right">
                              {can("users:read") && (
                                <Link
                                  href={`/users/${r.userId}`}
                                  className="text-[13px] font-semibold text-primary hover:underline"
                                >
                                  Open person
                                </Link>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          );
        })()}
    </>
  );
}
