"use client";

import { Check, Clock, Crown, ShieldCheck, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { ContributionStatus, GroupDetail } from "@/lib/groups-client";
import { cn } from "@/lib/cn";
import { useCircles } from "./CirclesFlow";

const CELL: Readonly<Record<ContributionStatus, { word: string; Icon: LucideIcon; tone: string }>> =
  {
    scheduled: { word: "Waiting", Icon: Clock, tone: "bg-surface-sunken text-ink-muted" },
    paid: { word: "Paid", Icon: Check, tone: "bg-leaf-tint text-leaf" },
    late: { word: "Paid late", Icon: TriangleAlert, tone: "bg-oro-tint text-oro-ink" },
    covered: { word: "Deposit", Icon: ShieldCheck, tone: "bg-tertiary-tint text-tertiary" },
    missed: { word: "Missed", Icon: X, tone: "bg-danger-tint text-danger" },
  };

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/**
 * The whole circle at once, for whoever is running it: every member down the side, every round across
 * the top, and in each cell whether that member has paid that round. The turn being paid out is marked.
 */
export function CircleBoard({ id }: Readonly<{ id: string }>) {
  const { href, locale } = useMoneyFlow();
  const gateway = useCircles();
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail | "failed">();

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await gateway.get(id);
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setGroup("failed");
      }
      setGroup(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, id, router]);

  const g = group && group !== "failed" ? group : undefined;
  const members = g ? [...g.members].sort((a, b) => (a.spot ?? 999) - (b.spot ?? 999)) : [];
  const key = (m: { username: string | null; displayName: string }) => m.username ?? m.displayName;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28 lg:max-w-7xl lg:pt-8 lg:pb-12">
      <ScreenHeader
        title={g ? `${g.name}: board` : "Circle board"}
        subtitle="Who has paid each round, at a glance."
        backHref={href(`/circles/${id}`)}
      />
      {group === undefined && (
        <div
          role="status"
          aria-label="Loading"
          className="h-72 animate-pulse rounded-[var(--radius-l)] bg-surface-sunken"
        />
      )}
      {group === "failed" && (
        <p role="alert" className="text-ink-muted">
          We couldn&apos;t load this circle. Check your connection and try again.
        </p>
      )}
      {g && g.rounds.length === 0 && (
        <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-ink-muted">
          The board fills in once the circle starts and its rounds are set.
        </p>
      )}
      {g && g.rounds.length > 0 && (
        <div className="grid gap-4">
          <ul aria-label="Key" className="flex flex-wrap gap-3 text-[13px] text-ink-muted">
            {(Object.keys(CELL) as ContributionStatus[]).map((s) => {
              const { word, Icon, tone } = CELL[s];
              return (
                <li key={s} className="flex items-center gap-1.5">
                  <span className={cn("grid size-5 place-items-center rounded-full", tone)}>
                    <Icon aria-hidden className="size-3" />
                  </span>
                  {word}
                </li>
              );
            })}
            <li className="flex items-center gap-1.5">
              <Crown aria-hidden className="size-4 text-oro-ink" />
              Paid out that round
            </li>
          </ul>
          <div className="overflow-x-auto rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
            <table className="w-full border-collapse text-left text-[13px]">
              <caption className="sr-only">Payments by member and round</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 border-b border-line bg-surface-raised px-4 py-3 text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase"
                  >
                    Member
                  </th>
                  {g.rounds.map((r) => (
                    <th
                      key={r.roundNo}
                      scope="col"
                      className="min-w-24 border-b border-line px-3 py-3 font-semibold whitespace-nowrap"
                    >
                      <span className="block">Round {r.roundNo}</span>
                      <span className="block text-[12px] font-normal text-ink-muted">
                        {day(r.dueOn)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={key(m)}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-line bg-surface-raised px-4 py-2.5 text-left font-semibold whitespace-nowrap"
                    >
                      {m.displayName}
                      {m.isYou && (
                        <span className="ml-1 text-[12px] font-normal text-ink-muted">(you)</span>
                      )}
                      <span className="block text-[12px] font-normal text-ink-muted">
                        {m.spot ? `Turn ${m.spot}` : "No turn yet"}
                      </span>
                    </th>
                    {g.rounds.map((r) => {
                      const cell = r.board.find((b) => key(b) === key(m));
                      const status = cell?.status ?? null;
                      const theirs = r.recipient !== null && r.recipient === m.username;
                      const look = status ? CELL[status] : null;
                      return (
                        <td key={r.roundNo} className="border-b border-line px-3 py-2.5">
                          <span className="flex items-center gap-1.5">
                            {look ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
                                  look.tone,
                                )}
                              >
                                <look.Icon aria-hidden className="size-3" />
                                {look.word}
                              </span>
                            ) : (
                              <span className="text-ink-muted">–</span>
                            )}
                            {theirs && (
                              <span title="Paid out this round" className="inline-flex">
                                <Crown
                                  aria-label="Paid out this round"
                                  className="size-4 text-oro-ink"
                                />
                              </span>
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-surface-raised px-4 py-3 text-left text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase"
                  >
                    Paid
                  </th>
                  {g.rounds.map((r) => (
                    <td
                      key={r.roundNo}
                      className="px-3 py-3 text-[12px] whitespace-nowrap text-ink-muted"
                    >
                      {r.paid} of {members.length}
                      {r.payout && (
                        <span className="block font-semibold text-ink">
                          <Amount {...r.payout} locale={locale} size="s" />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
