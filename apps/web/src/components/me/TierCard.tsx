import { ArrowUpRight, ChevronRight, Medal } from "lucide-react";
import Link from "next/link";
import type { Me } from "@/components/onboarding/MeGate";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { cn } from "@/lib/cn";
import { limitsFor } from "@/lib/money-flow";

/** The colour of each level's medal: plain for a starter, silver, then gold. */
export const MEDAL: Readonly<Record<number, string>> = {
  0: "bg-surface-sunken text-ink-muted",
  1: "bg-slate-200 text-slate-600 dark:bg-slate-600/40 dark:text-slate-200",
  2: "bg-oro-tint text-oro-ink",
};

/**
 * Where the person stands: their verification level and what it lets them do, how far up the ladder
 * that is, and their standing in circles. Raising the level leads to identity checks.
 */
export function TierCard({ me }: Readonly<{ me: Me }>) {
  if (me.country !== "NG" && me.country !== "GB") return null;
  const ladder = limitsFor(me.country);
  const tier = me.kycTier ?? 0;
  const rung = ladder.find((r) => r.tier === tier) ?? ladder[0]!;
  const top = tier >= ladder[ladder.length - 1]!.tier;
  const checking = me.kycStatus === "pending";

  return (
    <section
      aria-labelledby="tier"
      className="grid gap-4 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full",
              MEDAL[tier] ?? MEDAL[0],
            )}
          >
            <Medal className="size-6" />
          </span>
          <div className="grid gap-0.5">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-tertiary uppercase">
              {tier === 0 ? "Not verified yet" : `Level ${tier} of ${ladder.length - 1}`} ·{" "}
              {rung.how}
            </p>
            <h2 id="tier" className="font-display text-[22px] leading-6 font-bold">
              {rung.title}
            </h2>
          </div>
        </div>
        {me.trust && <TrustBadge level={me.trust.level} className="mt-0.5 shrink-0" />}
      </div>
      <p className="text-[14px] leading-5 text-ink-muted">{rung.unlocks}</p>
      <div aria-hidden className="flex gap-1.5">
        {ladder.slice(1).map((r) => (
          <span
            key={r.tier}
            className={cn("h-1.5 flex-1 rounded-full", r.tier <= tier ? "bg-primary" : "bg-line")}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <Link
          href="/wallet/limits"
          className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary"
        >
          See your limits
          <ChevronRight aria-hidden className="size-4" />
        </Link>
        {!top &&
          (checking ? (
            <span className="text-[13px] font-medium text-ink-muted">Being checked</span>
          ) : (
            <Link
              href="/verify"
              className="inline-flex items-center gap-1 rounded-full bg-oro px-3 py-1.5 text-[13px] font-semibold text-on-oro"
            >
              Raise your level
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          ))}
      </div>
    </section>
  );
}
