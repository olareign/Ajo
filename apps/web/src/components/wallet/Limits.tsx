"use client";

import { Check } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { cn } from "@/lib/cn";
import { limitsFor, toMinor } from "@/lib/money-flow";
import { useMoneyFlow } from "./MoneyFlow";

/** What each step of verification lets a person move, as a ladder with their own rung marked. */
export function Limits() {
  const { me, preview, country, currency, locale, rails } = useMoneyFlow();
  const ladder = limitsFor(country);
  // The numbers are real only once payments are connected; before that they would only be guesses.
  const showNumbers = preview || rails.connected.fund;
  const tier = preview ? 1 : (me.kycTier ?? 0);

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/wallet/limits" />}
      <ScreenHeader
        title="Your limits"
        subtitle="The more you verify, the more you can move. Limits keep everyone's money safer."
        backHref="/wallet"
      />
      <ol className="grid gap-4">
        {ladder.map((rung) => {
          const here = rung.tier === tier;
          const reached = rung.tier <= tier;
          return (
            <li
              key={rung.tier}
              aria-current={here ? "step" : undefined}
              className={cn(
                "grid gap-3 rounded-[var(--radius-l)] p-5",
                here
                  ? "border-[1.5px] border-primary bg-primary-tint"
                  : "bg-surface-raised shadow-lift",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-[20px] leading-6 font-semibold">{rung.title}</p>
                {here && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary">
                    <Check aria-hidden className="size-3.5" />
                    You are here
                  </span>
                )}
                {!here && !reached && (
                  <span className="text-xs font-semibold text-ink-muted">Locked</span>
                )}
              </div>
              <p className="text-[15px] leading-6 text-ink-muted">{rung.unlocks}</p>
              {showNumbers && rung.tier > 0 && (
                <dl className="grid grid-cols-2 gap-3 border-t-2 border-dashed border-line pt-3 text-[14px]">
                  <div className="grid gap-0.5">
                    <dt className="text-ink-muted">Each time</dt>
                    <dd>
                      <Amount
                        amount={toMinor(String(rung.perTransaction))}
                        currency={currency}
                        locale={locale}
                        size="s"
                      />
                    </dd>
                  </div>
                  <div className="grid gap-0.5">
                    <dt className="text-ink-muted">Each day</dt>
                    <dd>
                      <Amount
                        amount={toMinor(String(rung.daily))}
                        currency={currency}
                        locale={locale}
                        size="s"
                      />
                    </dd>
                  </div>
                </dl>
              )}
            </li>
          );
        })}
      </ol>
      {preview ? (
        <p className="mt-6 text-center text-[12px] leading-5 text-ink-muted">
          Sample numbers. The real limits are set before launch.
        </p>
      ) : (
        !showNumbers && (
          <p className="mt-6 text-center text-[14px] leading-5 text-ink-muted">
            Exact amounts appear here once payments are switched on.
          </p>
        )
      )}
    </main>
  );
}
