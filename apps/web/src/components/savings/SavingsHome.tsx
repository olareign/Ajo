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
import { dayText } from "@/lib/schedule";
import { recall, remember } from "@/lib/visit-cache";
import type { Plan } from "@/lib/savings-client";
import { Pot } from "./Pot";
import { useSavings, useSavingsLock } from "./SavingsFlow";

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
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/save" />}
      <ScreenHeader
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

          {open.length > 0 && (
            <section aria-labelledby="going" className="grid gap-3">
              <h2 id="going" className="font-display text-[18px] leading-6 font-semibold">
                Going now
              </h2>
              <ul className="grid gap-3">
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
              <ul className="grid gap-3">
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
        </div>
      )}
    </main>
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
