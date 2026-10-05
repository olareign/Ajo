"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleRing } from "@/components/CircleRing";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { GroupSummary } from "@/lib/groups-client";
import { formatMoney } from "@/lib/money-format";
import { longDayText } from "@/lib/schedule";
import { FREQ_WORDS, ORDER_WORDS, useCircles, useCirclesLock } from "./CirclesFlow";

/** Where an invite to a circle lands: what it is, what joining means, and one button to join. */
export function JoinCircle({ code }: Readonly<{ code: string }>) {
  const { preview, href, locale } = useMoneyFlow();
  const gateway = useCircles();
  const router = useRouter();
  const lock = useCirclesLock();
  const [group, setGroup] = useState<GroupSummary | "missing" | "failed">();
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [errorCode, setErrorCode] = useState<string>();

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.byCode(code);
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setGroup(
          result.failure.kind === "refused" && result.failure.status === 404 ? "missing" : "failed",
        );
      }
      if (result.data.isMember) return router.replace(href(`/circles/${result.data.id}`));
      setGroup(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, code, lock, router, attempt, href]);

  if (lock) return <FlowLocked lock={lock} title="Join a circle" path={`/circles/join/${code}`} />;

  if (group === undefined) {
    return (
      <p role="status" className="mx-auto max-w-md px-4 pt-10 text-ink-muted">
        Loading…
      </p>
    );
  }
  if (group === "missing" || group === "failed") {
    return (
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-10">
        <p role="alert" className="text-ink-muted">
          {group === "missing"
            ? "That invite isn't valid. Ask for a new link."
            : "We couldn't load this invite. Check your connection and try again."}
        </p>
        {group === "failed" ? (
          <Button onClick={() => (setGroup(undefined), setAttempt((n) => n + 1))}>Try again</Button>
        ) : (
          <ButtonLink href={href("/circles")}>Back to circles</ButtonLink>
        )}
      </main>
    );
  }

  const g = group;
  const closed = g.status !== "open" || g.memberCount >= g.size;

  async function join() {
    setError(undefined);
    setErrorCode(undefined);
    setBusy(true);
    const result = await gateway.joinByCode(code);
    setBusy(false);
    if (!result.ok) {
      if (result.failure.kind === "signed-out") return router.replace("/sign-in");
      setErrorCode(result.failure.kind === "refused" ? result.failure.code : undefined);
      return setError(result.failure.message);
    }
    router.push(href(`/circles/${result.data.id}`));
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/circles" />}
      <ScreenHeader
        title={`Join ${g.name}`}
        subtitle={`${g.creator.displayName} invited you.`}
        backHref={href("/circles")}
      />
      <section
        aria-label="The circle"
        className="grid justify-items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
      >
        <CircleRing
          members={Array.from({ length: g.size }, (_, i) => ({
            name: i < g.memberCount ? "Member" : "Open place",
            status: i < g.memberCount ? ("paid" as const) : ("pending" as const),
          }))}
          center={{ label: "joined", value: `${g.memberCount}/${g.size}` }}
          title={`${g.memberCount} of ${g.size} places taken`}
          size={200}
        />
        <p className="text-center text-[15px] leading-6">
          <Amount amount={g.contribution} currency={g.currency} locale={locale} size="s" />{" "}
          {FREQ_WORDS[g.frequency]}. Each turn pays{" "}
          <Amount amount={g.pot} currency={g.currency} locale={locale} size="s" />.
        </p>
        <p className="text-center text-[13px] text-ink-muted">
          First round {longDayText(g.startDate)} · {ORDER_WORDS[g.orderMethod]}
        </p>
      </section>

      <section
        aria-label="What joining means"
        className="mt-6 grid gap-2 rounded-[var(--radius-l)] bg-primary-tint p-4 text-[14px] leading-5"
      >
        <p className="font-semibold text-tertiary">What joining means</p>
        <p>
          You pay {formatMoney({ amount: g.contribution, currency: g.currency }, locale)} each
          round, from your wallet, with your auto-debit as backup.
        </p>
        <p>
          If you&apos;re new to circles you lock a deposit of {formatMoney(g.rules.deposit, locale)}{" "}
          until it ends (more to take one of the first {g.rules.earlySpots} turns). Trusted members
          lock nothing. Leave before it fills and it comes straight back.
        </p>
      </section>

      {error && (
        <p role="alert" className="mt-4 text-center text-[15px] font-medium text-danger">
          {error}{" "}
          {errorCode === "no_mandate" && (
            <Link href={href("/wallet/mandate")} className="underline underline-offset-4">
              Set up auto-debit
            </Link>
          )}
          {errorCode === "deposit_needed" && (
            <Link href={href("/wallet/add")} className="underline underline-offset-4">
              Add money
            </Link>
          )}
        </p>
      )}
      <div className="mt-6 grid gap-3">
        {closed ? (
          <p role="status" className="text-center text-[15px] text-ink-muted">
            {g.memberCount >= g.size
              ? "This circle is full."
              : "This circle is no longer taking people."}
          </p>
        ) : (
          <Button size="lg" block variant="money" disabled={busy} onClick={() => void join()}>
            {busy ? "Joining…" : "Join this circle"}
          </Button>
        )}
      </div>
    </main>
  );
}
