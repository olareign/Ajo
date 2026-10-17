"use client";

import { ChevronRight, Plus } from "lucide-react";
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
import { cn } from "@/lib/cn";
import { dayText, FREQUENCY_WORD } from "@/lib/schedule";
import { recall, remember } from "@/lib/visit-cache";
import type { Plan } from "@/lib/savings-client";
import { PlanAside } from "@/components/desk/asides";
import { Facts, Split } from "@/components/desk/Split";
import { Pot } from "./Pot";
import { useSavings, useSavingsLock } from "./SavingsFlow";
import { PAGE } from "@/lib/page";

export const ratioOf = (plan: Plan) => {
  const target = BigInt(plan.target.amount);
  if (plan.status === "completed") return 1;
  return target === 0n
    ? 0
    : Math.min(1, Number((BigInt(plan.saved.amount) * 1000n) / target) / 1000);
};

export const toneOf = (plan: Plan) =>
  plan.status === "completed"
    ? "done"
    : plan.status === "cancelled"
      ? "ended"
      : plan.status === "paused"
        ? "paused"
        : "active";

const PILL: Partial<Record<Plan["status"], { word: string; tone: string }>> = {
  paused: { word: "Paused", tone: "bg-surface-sunken text-ink-muted" },
  completed: { word: "Complete", tone: "bg-leaf-tint text-leaf" },
  cancelled: { word: "Ended early", tone: "bg-surface-sunken text-ink-muted" },
};

export function StatusWord({ status }: Readonly<{ status: Plan["status"] }>) {
  const pill = PILL[status];
  return pill ? (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", pill.tone)}>
      {pill.word}
    </span>
  ) : null;
}

/** All of a person's saving plans, each as a pot that fills as it is paid into. */
export function SavingsHome() {
  const { preview, href, locale } = useMoneyFlow();
  const gateway = useSavings();
  const router = useRouter();
  const lock = useSavingsLock();
  // Within a visit the last copy shows at once while a fresh one loads (never in a preview).
  const cacheKey = preview ? null : "screen:save";
  const [plans, setPlans] = useState<readonly Plan[] | "failed" | undefined>(() =>
    cacheKey ? recall<readonly Plan[]>(cacheKey) : undefined,
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
        return setPlans((was) => (Array.isArray(was) ? was : "failed"));
      }
      if (cacheKey) remember(cacheKey, result.data);
      setPlans(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt, cacheKey]);

  if (lock) return <FlowLocked lock={lock} title="Savings" path="/save" />;

  const open = Array.isArray(plans)
    ? plans.filter((p) => p.status === "active" || p.status === "paused")
    : [];
  const finished = Array.isArray(plans)
    ? plans.filter((p) => p.status === "completed" || p.status === "cancelled")
    : [];
  const totals = new Map<string, bigint>();
  for (const p of open)
    totals.set(p.saved.currency, (totals.get(p.saved.currency) ?? 0n) + BigInt(p.saved.amount));

  return (
    <main className={PAGE}>
      {preview && <PreviewRibbon exitHref="/save" />}
      <ScreenHeader
        tab
        title="Savings"
        subtitle="Little by little, the pot fills."
        backHref={preview ? href("/today") : undefined}
      />

      {plans === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {plans === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your plans. Check your connection and try again.
          </p>
          <Button
            onClick={() => {
              setPlans(undefined);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {Array.isArray(plans) && plans.length === 0 && (
        <section
          aria-label="No plans yet"
          className="grid justify-items-center gap-5 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift"
        >
          <Pot ratio={0} size={132} label="An empty pot" />
          <p className="font-display text-[22px] leading-7 font-semibold">
            Your first pot is empty
          </p>
          <p className="text-[15px] leading-6 text-ink-muted">
            Pick what you&apos;re saving for, how much, and how often. We take it on the day, and it
            comes back to your wallet at the end.
          </p>
          <ButtonLink href={href("/save/new")} size="lg" block>
            Start a plan
          </ButtonLink>
        </section>
      )}

      {Array.isArray(plans) && plans.length > 0 && (
        // From a tablet up: what's in your pots and the figures that matter beside it, then every
        // plan as a card; how plans work sits at the side.
        <Split note={<PlanAside />}>
          {totals.size > 0 && (
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] 2xl:items-stretch">
              <div className="grid gap-6">
                {[...totals].map(([currency, total]) => (
                  <section
                    key={currency}
                    aria-label="Saved so far"
                    className="hero-card grid gap-4 overflow-hidden rounded-[var(--radius-xl)] p-5 shadow-lift"
                  >
                    <div className="grid gap-1">
                      <p className="text-[13px] font-semibold tracking-[0.04em] text-on-hero-muted">
                        IN YOUR POTS
                      </p>
                      <Amount
                        amount={total.toString()}
                        currency={currency}
                        locale={locale}
                        size="l"
                        tone="hero"
                      />
                      <p className="text-[14px] text-on-hero-muted">
                        across {open.length} {open.length === 1 ? "plan" : "plans"}
                      </p>
                    </div>
                    <Link
                      href={href("/save/new")}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-m bg-oro px-4 text-[15px] font-semibold text-on-oro transition-[filter] hover:brightness-95"
                    >
                      <Plus aria-hidden className="size-5" />
                      New plan
                    </Link>
                  </section>
                ))}
              </div>
              <PlanFacts open={open} locale={locale} />
            </div>
          )}

          {open.length > 0 && (
            <section aria-labelledby="going" className="grid gap-3">
              <h2 id="going" className="font-display text-[18px] leading-6 font-semibold">
                Going now
              </h2>
              <ul className="grid gap-3 xl:grid-cols-2">
                {open.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    locale={locale}
                    href={href(`/save/${plan.id}`)}
                  />
                ))}
              </ul>
            </section>
          )}
          {finished.length > 0 && (
            <section aria-labelledby="done" className="grid gap-3">
              <h2 id="done" className="font-display text-[18px] leading-6 font-semibold">
                Finished
              </h2>
              <ul className="grid gap-3 xl:grid-cols-2">
                {finished.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    locale={locale}
                    href={href(`/save/${plan.id}`)}
                  />
                ))}
              </ul>
            </section>
          )}
          {totals.size === 0 && (
            <ButtonLink href={href("/save/new")} size="lg" block>
              <Plus aria-hidden className="size-5" />
              Start a plan
            </ButtonLink>
          )}
        </Split>
      )}
    </main>
  );
}

/**
 * The figures behind the pots, for plans still going, in the first pot's currency: the next
 * payment, how many payments are made, and what the plans add up to once every payment is made.
 */
function PlanFacts({ open, locale }: Readonly<{ open: readonly Plan[]; locale: string }>) {
  const currency = open[0]?.saved.currency;
  const same = open.filter((p) => p.saved.currency === currency);
  const next = same
    .flatMap((p) => (p.nextDebit ? [{ plan: p, ...p.nextDebit }] : []))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0];
  const paid = same.reduce((n, p) => n + p.paidDebits, 0);
  const total = same.reduce((n, p) => n + p.totalDebits, 0);
  const target = same.reduce((n, p) => n + BigInt(p.target.amount), 0n);
  if (!currency) return null;
  return (
    <Facts
      label="Your plans at a glance"
      className="grid content-center"
      facts={[
        {
          label: "Next payment",
          value: next ? <Amount {...next.amount} locale={locale} size="m" /> : "None due",
          note: next ? `${next.plan.name} · ${dayText(next.dueOn)}` : undefined,
        },
        {
          label: "Payments made",
          value: `${paid} of ${total}`,
          note: total > 0 ? `${Math.round((paid / total) * 100)}% of the way` : undefined,
        },
        {
          label: "Saving towards",
          value: <Amount amount={target.toString()} currency={currency} locale={locale} size="m" />,
          note: "Once every payment is made",
        },
      ]}
    />
  );
}

function PlanCard({ plan, locale, href }: Readonly<{ plan: Plan; locale: string; href: string }>) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift transition-transform active:scale-[0.99]"
      >
        <Pot
          ratio={ratioOf(plan)}
          tone={toneOf(plan)}
          size={64}
          label={`${plan.name}, ${Math.round(ratioOf(plan) * 100)}% full`}
        />
        <span className="grid min-w-0 grow gap-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-display text-[18px] leading-6 font-semibold">
              {plan.name}
            </span>
            <StatusWord status={plan.status} />
          </span>
          <span className="text-[14px] text-ink-muted">
            <Amount {...plan.saved} locale={locale} size="s" /> of{" "}
            <Amount {...plan.target} locale={locale} size="s" tone="muted" />
          </span>
          <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <span
              className={cn(
                "block h-full rounded-full",
                plan.status === "active" || plan.status === "completed"
                  ? "bg-primary"
                  : "bg-line-strong",
              )}
              style={{ width: `${Math.round(ratioOf(plan) * 100)}%` }}
            />
          </span>
          <span className="text-[13px] text-ink-muted">
            {plan.status === "active" || plan.status === "paused" ? (
              <>
                <Amount {...plan.amount} locale={locale} size="s" tone="muted" />{" "}
                {FREQUENCY_WORD[plan.frequency]} · {plan.paidDebits} of {plan.totalDebits} payments
                <br />
              </>
            ) : null}
            {plan.nextDebit
              ? `Next: ${dayText(plan.nextDebit.dueOn)}`
              : plan.status === "completed"
                ? "Paid out to your wallet"
                : plan.status === "cancelled"
                  ? "Ended early"
                  : "Nothing left to take"}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted" />
      </Link>
    </li>
  );
}
