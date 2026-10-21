"use client";

import { Compass, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import { CircleRing } from "@/components/CircleRing";
import { dayText } from "@/lib/schedule";
import { recall, remember } from "@/lib/visit-cache";
import type { GroupSummary } from "@/lib/groups-client";
import { FREQ_WORDS, useCircles, useCirclesLock } from "./CirclesFlow";
import { PAGE } from "@/lib/page";
import { FilterTabs, SummaryBand } from "@/components/desk/Band";
import { Pager } from "@/components/ui/Pager";
import { usePaged } from "@/lib/paging";

export const STATUS_WORD: Record<GroupSummary["status"], string> = {
  open: "Filling up",
  picking: "Picking turns",
  running: "Under way",
  completed: "Complete",
  cancelled: "Called off",
};

/** All of a person's circles, each as a small ring of beads: filled for the places taken. */
export function CirclesHome() {
  const { preview, href, locale } = useMoneyFlow();
  const gateway = useCircles();
  const router = useRouter();
  const lock = useCirclesLock();
  // Within a visit the last copy shows at once while a fresh one loads (never in a preview).
  const cacheKey = preview ? null : "screen:circles";
  const [groups, setGroups] = useState<readonly GroupSummary[] | "failed" | undefined>(() =>
    cacheKey ? recall<readonly GroupSummary[]>(cacheKey) : undefined,
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.list();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setGroups((was) => (Array.isArray(was) ? was : "failed"));
      }
      if (cacheKey) remember(cacheKey, result.data);
      setGroups(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt, cacheKey]);

  if (lock) return <FlowLocked lock={lock} title="Circles" path="/circles" />;

  const going = Array.isArray(groups)
    ? groups.filter((g) => ["open", "picking", "running"].includes(g.status))
    : [];
  const over = Array.isArray(groups)
    ? groups.filter((g) => ["completed", "cancelled"].includes(g.status))
    : [];

  return (
    <main className={PAGE}>
      {preview && <PreviewRibbon exitHref="/circles" />}
      <ScreenHeader
        tab
        title="Circles"
        subtitle="Save together, one turn at a time."
        backHref={preview ? href("/today") : undefined}
        pageAction={
          <div className="grid gap-3 sm:grid-cols-2">
            <ButtonLink href={href("/circles/discover")} size="lg" variant="quiet" block>
              <Compass aria-hidden className="size-5" />
              Find a circle to join
            </ButtonLink>
            <ButtonLink href={href("/circles/new")} size="lg" block>
              <Plus aria-hidden className="size-5" />
              Start a circle
            </ButtonLink>
          </div>
        }
      />

      {groups === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {groups === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your circles. Check your connection and try again.
          </p>
          <Button onClick={() => (setGroups(undefined), setAttempt((n) => n + 1))}>
            Try again
          </Button>
        </div>
      )}

      {Array.isArray(groups) && groups.length === 0 && (
        <section
          aria-label="No circles yet"
          className="grid justify-items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift md:p-10"
        >
          <CircleRing
            members={Array.from({ length: 6 }, () => ({
              name: "Open place",
              status: "pending" as const,
            }))}
            size={180}
            title="An empty circle"
          />
          <p className="font-display text-[22px] leading-7 font-semibold">No circle yet</p>
          <p className="max-w-prose text-[15px] leading-6 text-ink-muted">
            A circle is a few people who each pay in every round, and take turns collecting the
            whole pot. Start one with friends, or find one to join.
          </p>
        </section>
      )}

      {Array.isArray(groups) && groups.length > 0 && (
        <CircleList going={going} over={over} locale={locale} href={href} />
      )}
    </main>
  );
}

/** The summary band, then the circles in two tabs (the ones you're in, finished) a page at a time. */
function CircleList({
  going,
  over,
  locale,
  href,
}: Readonly<{
  going: readonly GroupSummary[];
  over: readonly GroupSummary[];
  locale: string;
  href: (path: string) => string;
}>) {
  const [tab, setTab] = useState<"going" | "over">(going.length > 0 ? "going" : "over");
  const shown = tab === "going" ? going : over;
  const paged = usePaged(shown);
  return (
    <div className="grid gap-6">
      {going.length > 0 && <CircleBand going={going} locale={locale} />}
      {going.length > 0 && over.length > 0 && (
        <FilterTabs
          label="Which circles"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "going", label: "Your circles", count: going.length },
            { id: "over", label: "Finished", count: over.length },
          ]}
        />
      )}
      <section
        aria-labelledby="circles-title"
        className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift"
      >
        <h2
          id="circles-title"
          className="px-5 pt-5 pb-1 font-display text-[20px] leading-7 font-bold md:px-6"
        >
          {tab === "going" ? "Your circles" : "Finished"}
        </h2>
        <ul className="grid gap-3 p-4 md:p-6 xl:grid-cols-2">
          {paged.slice.map((g) => (
            <CircleCard key={g.id} group={g} href={href(`/circles/${g.id}`)} locale={locale} />
          ))}
        </ul>
        <Pager paged={paged} noun={["circle", "circles"]} className="border-t border-line" />
      </section>
    </div>
  );
}

/** The circles still going, in the first one's currency: how many, what you pay in, your pots. */
function CircleBand({
  going,
  locale,
}: Readonly<{ going: readonly GroupSummary[]; locale: string }>) {
  const currency = going[0]!.currency;
  const same = going.filter((g) => g.currency === currency);
  const sum = (key: "contribution" | "pot") =>
    same.reduce((n, g) => n + BigInt(g[key]), 0n).toString();
  const running = going.filter((g) => g.status === "running").length;
  return (
    <SummaryBand
      label="Your circles at a glance"
      figures={[
        {
          label: "Circles you're in",
          value: going.length,
          note: `${running} running, ${going.length - running} getting ready`,
        },
        {
          label: "You pay in",
          value: (
            <Amount
              amount={sum("contribution")}
              currency={currency}
              locale={locale}
              size="m"
              tone="hero"
            />
          ),
          note: same.length === 1 ? FREQ_WORDS[same[0]!.frequency] : "each round, all circles",
        },
        {
          label: "Your pots",
          value: (
            <Amount amount={sum("pot")} currency={currency} locale={locale} size="m" tone="hero" />
          ),
          note: "One turn in each circle, before any fee",
        },
      ]}
    />
  );
}

export function CircleCard({
  group,
  href,
  locale,
  note,
}: Readonly<{ group: GroupSummary; href: string; locale: string; note?: string | undefined }>) {
  const seats = Array.from({ length: group.size }, (_, i) => ({
    name: i < group.memberCount ? "Member" : "Open place",
    status: i < group.memberCount ? ("paid" as const) : ("pending" as const),
  }));
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
      >
        <CircleRing
          members={seats}
          size={76}
          title={`${group.name}: ${group.memberCount} of ${group.size} places taken`}
        />
        <span className="grid min-w-0 gap-1">
          <span className="truncate font-display text-[18px] leading-6 font-semibold">
            {group.name}
          </span>
          <span className="text-[14px] text-ink-muted">
            <Amount
              amount={group.contribution}
              currency={group.currency}
              locale={locale}
              size="s"
            />{" "}
            {FREQ_WORDS[group.frequency]}
          </span>
          <span className="text-[13px] text-ink-muted">
            {STATUS_WORD[group.status]}
            {group.status === "open" && ` · ${group.memberCount} of ${group.size} joined`}
            {group.status === "running" && group.mySpot
              ? ` · your turn is ${group.mySpot} of ${group.size}`
              : ""}
            {group.status === "open" ? ` · starts ${dayText(group.startDate)}` : ""}
          </span>
          {note && <span className="text-[13px] font-medium text-leaf">{note}</span>}
        </span>
      </Link>
    </li>
  );
}
