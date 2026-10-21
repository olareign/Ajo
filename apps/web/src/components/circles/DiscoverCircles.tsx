"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { Pager } from "@/components/ui/Pager";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { DiscoveredGroup } from "@/lib/groups-client";
import { formatMoney } from "@/lib/money-format";
import { usePaged } from "@/lib/paging";
import { dayText, todayIn } from "@/lib/schedule";
import { FREQ_WORDS, ORDER_WORDS, useCircles, useCirclesLock } from "./CirclesFlow";
import { PAGE } from "@/lib/page";

export type CircleFilter = Readonly<{
  text: string;
  /** "any", or the name of one of the price bands. */
  pays: "any" | "low" | "mid" | "high";
  frequency: "any" | "weekly" | "biweekly" | "monthly";
  starts: "any" | "this-month" | "next-month";
  friendsOnly: boolean;
  sort: "friends" | "soonest" | "cheapest" | "places";
}>;

export const NO_CIRCLE_FILTER: CircleFilter = {
  text: "",
  pays: "any",
  frequency: "any",
  starts: "any",
  friendsOnly: false,
  sort: "friends",
};

/** The whole-unit edges between "up to", "from to" and "over", per currency. */
const BANDS: Readonly<Record<string, readonly [number, number]>> = {
  NGN: [20_000, 50_000],
  GBP: [20, 50],
};

const monthOf = (day: string) => day.slice(0, 7);
const nextMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

/** Narrows the open circles already loaded, then orders them. The API's own order is "friends first". */
export function filterCircles(
  groups: readonly DiscoveredGroup[],
  f: CircleFilter,
  currency: string,
  today: string,
): readonly DiscoveredGroup[] {
  const [low, high] = BANDS[currency] ?? BANDS.NGN!;
  const q = f.text.trim().toLowerCase().replace(/^@/, "");
  const month = monthOf(today);
  const kept = groups.filter((g) => {
    const whole = Number(BigInt(g.contribution) / 100n);
    if (f.pays === "low" && whole > low) return false;
    if (f.pays === "mid" && (whole <= low || whole > high)) return false;
    if (f.pays === "high" && whole <= high) return false;
    if (f.frequency !== "any" && g.frequency !== f.frequency) return false;
    if (f.starts === "this-month" && monthOf(g.startDate) !== month) return false;
    if (f.starts === "next-month" && monthOf(g.startDate) !== nextMonth(month)) return false;
    if (f.friendsOnly && g.friendsIn === 0) return false;
    if (!q) return true;
    return [g.name, g.community ?? "", g.creator.username ?? "", g.creator.displayName].some((t) =>
      t.toLowerCase().includes(q),
    );
  });
  const placesLeft = (g: DiscoveredGroup) => g.size - g.memberCount;
  if (f.sort === "soonest")
    return kept.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (f.sort === "cheapest")
    return kept.slice().sort((a, b) => Number(BigInt(a.contribution) - BigInt(b.contribution)));
  if (f.sort === "places") return kept.slice().sort((a, b) => placesLeft(b) - placesLeft(a));
  return kept;
}

const field =
  "h-12 rounded-[14px] border border-line-strong bg-surface px-3 text-[15px] font-normal text-ink";

/** Public circles that are still open, with filters; the ones with your friends in them come first. */
export function DiscoverCircles() {
  const { preview, href, locale, currency } = useMoneyFlow();
  const gateway = useCircles();
  const router = useRouter();
  const lock = useCirclesLock();
  const [found, setFound] = useState<readonly DiscoveredGroup[] | "failed">();
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<CircleFilter>(NO_CIRCLE_FILTER);
  const today = todayIn(currency);
  const shown = Array.isArray(found) ? filterCircles(found, filter, currency, today) : [];
  const paged = usePaged(shown);
  const narrowed =
    JSON.stringify({ ...filter, sort: "" }) !== JSON.stringify({ ...NO_CIRCLE_FILTER, sort: "" });
  const change = (next: Partial<CircleFilter>) => {
    setFilter((f) => ({ ...f, ...next }));
    paged.setPage(1);
  };

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.discover();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setFound("failed");
      }
      setFound(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Find a circle" path="/circles/discover" />;

  const [low, high] = BANDS[currency] ?? BANDS.NGN!;
  const money = (whole: number) => formatMoney({ amount: String(whole * 100), currency }, locale);

  return (
    <main className={PAGE}>
      {preview && <PreviewRibbon exitHref="/circles" />}
      <ScreenHeader
        title="Find a circle to join"
        subtitle="Open circles with places left. Every member has had their identity checked."
        backHref={href("/circles")}
      />
      {found === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {found === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load circles. Check your connection and try again.
          </p>
          <Button onClick={() => (setFound(undefined), setAttempt((n) => n + 1))}>Try again</Button>
        </div>
      )}
      {Array.isArray(found) && found.length === 0 && (
        <p className="text-[15px] leading-6 text-ink-muted">
          No open circles right now. Start your own, and invite your friends.
        </p>
      )}
      {Array.isArray(found) && found.length > 0 && (
        <div className="grid gap-6">
          <div
            role="search"
            aria-label="Filter circles"
            className="grid gap-4 rounded-[var(--radius-xl)] bg-surface-raised p-4 shadow-lift md:grid-cols-2 md:p-6 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]"
          >
            <label className="grid gap-1.5 text-[13px] font-semibold md:col-span-2 xl:col-span-1">
              Search
              <span className="flex h-12 items-center gap-2 rounded-[14px] border border-line-strong bg-surface px-3 focus-within:border-primary">
                <Search aria-hidden className="size-4 shrink-0 text-ink-muted" />
                <input
                  type="search"
                  value={filter.text}
                  onChange={(e) => change({ text: e.target.value })}
                  placeholder="Name, community or @username"
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-normal outline-none"
                />
              </span>
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold">
              Each pays
              <select
                value={filter.pays}
                onChange={(e) => change({ pays: e.target.value as CircleFilter["pays"] })}
                className={field}
              >
                <option value="any">Any amount</option>
                <option value="low">Up to {money(low)}</option>
                <option value="mid">
                  {money(low)} to {money(high)}
                </option>
                <option value="high">Over {money(high)}</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold">
              How often
              <select
                value={filter.frequency}
                onChange={(e) => change({ frequency: e.target.value as CircleFilter["frequency"] })}
                className={field}
              >
                <option value="any">Any</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold">
              Starts
              <select
                value={filter.starts}
                onChange={(e) => change({ starts: e.target.value as CircleFilter["starts"] })}
                className={field}
              >
                <option value="any">Any time</option>
                <option value="this-month">This month</option>
                <option value="next-month">Next month</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold">
              Sort
              <select
                value={filter.sort}
                onChange={(e) => change({ sort: e.target.value as CircleFilter["sort"] })}
                className={field}
              >
                <option value="friends">Friends first</option>
                <option value="soonest">Starting soonest</option>
                <option value="cheapest">Smallest payment</option>
                <option value="places">Most places left</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-3 text-[15px] md:col-span-2 xl:col-span-5">
              <input
                type="checkbox"
                checked={filter.friendsOnly}
                onChange={(e) => change({ friendsOnly: e.target.checked })}
                className="size-5 accent-[var(--primary)]"
              />
              Only circles with a friend in them
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink-muted" aria-live="polite">
              {shown.length} open {shown.length === 1 ? "circle" : "circles"}
            </h2>
            {narrowed && (
              <Button
                variant="quiet"
                onClick={() => {
                  setFilter((f) => ({ ...NO_CIRCLE_FILTER, sort: f.sort }));
                  paged.setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-ink-muted">
              No circles match that. Try fewer filters.
            </p>
          ) : (
            <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift">
              <ul
                aria-label="Open circles"
                className="grid gap-4 p-4 md:p-6 lg:grid-cols-2 2xl:grid-cols-3"
              >
                {paged.slice.map((g) => (
                  <DiscoverCard
                    key={g.id}
                    group={g}
                    href={href(`/circles/${g.id}`)}
                    locale={locale}
                  />
                ))}
              </ul>
              <Pager paged={paged} noun={["circle", "circles"]} className="border-t border-line" />
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function DiscoverCard({
  group,
  href,
  locale,
}: Readonly<{ group: DiscoveredGroup; href: string; locale: string }>) {
  const left = group.size - group.memberCount;
  return (
    <li className="grid content-between gap-4 rounded-[var(--radius-l)] border border-line p-5">
      <div className="grid gap-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[19px] leading-6 font-semibold">{group.name}</h3>
          <span className="shrink-0 rounded-full bg-primary-tint px-2.5 py-1 text-[12px] font-semibold text-primary">
            {left} {left === 1 ? "place" : "places"} left
          </span>
        </div>
        <p className="text-[13px] text-ink-muted">
          {group.creator.username ? `Started by @${group.creator.username}` : "Started by a member"}
          {group.community ? ` · ${group.community}` : ""}
        </p>
        {group.friendsIn > 0 && (
          <p className="text-[13px] font-medium text-leaf">
            {group.friendsIn} {group.friendsIn === 1 ? "friend is" : "friends are"} in this circle
          </p>
        )}
      </div>
      <p className="text-[14px] leading-5 text-ink-muted">
        <Amount amount={group.contribution} currency={group.currency} locale={locale} size="s" />{" "}
        {FREQ_WORDS[group.frequency]} · {group.size} people · pot{" "}
        <Amount
          amount={group.pot}
          currency={group.currency}
          locale={locale}
          size="s"
          tone="muted"
        />
        <br />
        Starts {dayText(group.startDate)} · {ORDER_WORDS[group.orderMethod]}
      </p>
      <Link
        href={href}
        className="grid min-h-11 place-items-center rounded-m bg-primary px-4 text-[15px] font-semibold text-on-primary hover:bg-primary-deep"
      >
        See and join
      </Link>
    </li>
  );
}
