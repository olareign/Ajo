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
import { FilterTabs, SummaryBand } from "@/components/desk/Band";
import { Pager } from "@/components/ui/Pager";
import { usePaged } from "@/lib/paging";
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

  return (
    <main className={PAGE}>
      {preview && <PreviewRibbon exitHref="/save" />}
      <ScreenHeader
        tab
        title="Savings"
        subtitle="Little by little, the pot fills."
        backHref={preview ? href("/today") : undefined}
        pageAction={
          <ButtonLink href={href("/save/new")} size="lg" block>
            <Plus aria-hidden className="size-5" />
            New plan
          </ButtonLink>
        }
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
          className="grid justify-items-center gap-5 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift md:p-10"
        >
          <Pot ratio={0} size={132} label="An empty pot" />
          <p className="font-display text-[22px] leading-7 font-semibold">
            Your first pot is empty
          </p>
          <p className="max-w-prose text-[15px] leading-6 text-ink-muted">
            Pick what you&apos;re saving for, how much, and how often. We take it on the day, and it
            comes back to your wallet at the end.
          </p>
          <ButtonLink href={href("/save/new")} size="lg" className="md:min-w-64">
            Start a plan
          </ButtonLink>
        </section>
      )}

      {Array.isArray(plans) && plans.length > 0 && (
        <PlanList open={open} finished={finished} locale={locale} href={href} />
      )}
    </main>
  );
}

/** The summary band, then the plans in two tabs (going now, finished) a page at a time. */
function PlanList({
  open,
  finished,
  locale,
  href,
}: Readonly<{
  open: readonly Plan[];
  finished: readonly Plan[];
  locale: string;
  href: (path: string) => string;
}>) {
  const [tab, setTab] = useState<"going" | "finished">(open.length > 0 ? "going" : "finished");
  const shown = tab === "going" ? open : finished;
  const paged = usePaged(shown);
  return (
    <div className="grid gap-6">
      {open.length > 0 && <PlanBand open={open} locale={locale} />}
      {finished.length > 0 && open.length > 0 && (
        <FilterTabs
          label="Which plans"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "going", label: "Going now", count: open.length },
            { id: "finished", label: "Finished", count: finished.length },
          ]}
        />
      )}
      <section
        aria-labelledby="plans-title"
        className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift"
      >
        <h2
          id="plans-title"
          className="px-5 pt-5 pb-1 font-display text-[20px] leading-7 font-bold md:px-6"
        >
          {tab === "going" ? "Going now" : "Finished"}
        </h2>
        <ul className="grid gap-3 p-4 md:p-6 xl:grid-cols-2">
          {paged.slice.map((plan) => (
            <PlanCard key={plan.id} plan={plan} locale={locale} href={href(`/save/${plan.id}`)} />
          ))}
        </ul>
        <Pager paged={paged} noun={["plan", "plans"]} className="border-t border-line" />
      </section>
    </div>
  );
}

/**
 * The figures that matter for plans still going, in the first pot's currency: what is in the
 * pots, the next payment, how many payments are made, and what the plans add up to once every
 * payment is made.
 */
function PlanBand({ open, locale }: Readonly<{ open: readonly Plan[]; locale: string }>) {
  const currency = open[0]?.saved.currency;
  const same = open.filter((p) => p.saved.currency === currency);
  const next = same
    .flatMap((p) => (p.nextDebit ? [{ plan: p, ...p.nextDebit }] : []))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0];
  const saved = same.reduce((n, p) => n + BigInt(p.saved.amount), 0n);
  const paid = same.reduce((n, p) => n + p.paidDebits, 0);
  const total = same.reduce((n, p) => n + p.totalDebits, 0);
  const target = same.reduce((n, p) => n + BigInt(p.target.amount), 0n);
  if (!currency) return null;
  return (
    <SummaryBand
      label="Saved so far"
      figures={[
        {
          label: "In your pots",
          value: (
            <Amount
              amount={saved.toString()}
              currency={currency}
              locale={locale}
              size="m"
              tone="hero"
            />
          ),
          note: `across ${open.length} ${open.length === 1 ? "plan" : "plans"}`,
        },
        {
          label: "Next payment",
          value: next ? (
            <Amount {...next.amount} locale={locale} size="m" tone="hero" />
          ) : (
            "None due"
          ),
          note: next ? `${next.plan.name} · ${dayText(next.dueOn)}` : undefined,
        },
        {
          label: "Payments made",
          value: `${paid} of ${total}`,
          note: total > 0 ? `${Math.round((paid / total) * 100)}% of the way` : undefined,
        },
        {
          label: "Saving towards",
          value: (
            <Amount
              amount={target.toString()}
              currency={currency}
              locale={locale}
              size="m"
              tone="hero"
            />
          ),
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
