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
import type { GroupSummary } from "@/lib/groups-client";
import { FREQ_WORDS, useCircles, useCirclesLock } from "./CirclesFlow";

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
  const [groups, setGroups] = useState<readonly GroupSummary[] | "failed">();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.list();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setGroups("failed");
      }
      setGroups(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Circles" path="/circles" />;

  const going = Array.isArray(groups)
    ? groups.filter((g) => ["open", "picking", "running"].includes(g.status))
    : [];
  const over = Array.isArray(groups)
    ? groups.filter((g) => ["completed", "cancelled"].includes(g.status))
    : [];

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/circles" />}
      <ScreenHeader
        title="Circles"
        subtitle="Save together, one turn at a time."
        backHref={preview ? href("/today") : undefined}
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

      {Array.isArray(groups) && (
        <div className="grid gap-6">
          {groups.length === 0 && (
            <section
              aria-label="No circles yet"
              className="grid justify-items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift"
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
              <p className="text-[15px] leading-6 text-ink-muted">
                A circle is a few people who each pay in every round, and take turns collecting the
                whole pot. Start one with friends, or find one to join.
              </p>
            </section>
          )}

          {going.length > 0 && (
            <section aria-labelledby="going" className="grid gap-3">
              <h2 id="going" className="font-display text-[20px] leading-7 font-semibold">
                Your circles
              </h2>
              <ul className="grid gap-3">
                {going.map((g) => (
                  <CircleCard
                    key={g.id}
                    group={g}
                    href={href(`/circles/${g.id}`)}
                    locale={locale}
                  />
                ))}
              </ul>
            </section>
          )}
          {over.length > 0 && (
            <section aria-labelledby="over" className="grid gap-3">
              <h2 id="over" className="font-display text-[20px] leading-7 font-semibold">
                Finished
              </h2>
              <ul className="grid gap-3">
                {over.map((g) => (
                  <CircleCard
                    key={g.id}
                    group={g}
                    href={href(`/circles/${g.id}`)}
                    locale={locale}
                  />
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-3">
            <ButtonLink href={href("/circles/new")} size="lg" block>
              <Plus aria-hidden className="size-5" />
              Start a circle
            </ButtonLink>
            <ButtonLink href={href("/circles/discover")} size="lg" block variant="quiet">
              <Compass aria-hidden className="size-5" />
              Find a circle to join
            </ButtonLink>
          </div>
        </div>
      )}
    </main>
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
