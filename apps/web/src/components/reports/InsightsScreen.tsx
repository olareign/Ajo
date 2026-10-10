"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { send } from "@/lib/api-send";
import { monthLabel, readInsights, type InsightMonth } from "@/lib/insights";
import { countryConfig } from "@/lib/kyc-config";
import { currencyName } from "@/lib/wallet";
import { InOutChart, SavingsLine } from "./Charts";

export function InsightsScreen() {
  return <MeGate needs="onboarded">{(me) => <Insights me={me} />}</MeGate>;
}

const RANGES = [
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
  { value: "24", label: "2 years" },
] as const;

type Load =
  | Readonly<{ phase: "loading" }>
  | Readonly<{ phase: "ready"; months: InsightMonth[] }>
  | Readonly<{ phase: "failed"; message: string }>;

/** Where your money went, month by month: what came in, what went out, and how your savings grew. */
function Insights({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  const locale = countryConfig(me.country)?.locale ?? "en-GB";
  const [range, setRange] = useState<string>("12");
  const [load, setLoad] = useState<Load>({ phase: "loading" });
  const [currency, setCurrency] = useState<string>();

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await send<Record<string, unknown>>(
        "GET",
        `/api/wallet/insights?months=${range}`,
      );
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setLoad({ phase: "failed", message: result.failure.message });
      }
      const months = readInsights(result.data);
      setLoad(
        months
          ? { phase: "ready", months }
          : { phase: "failed", message: "We couldn't read these figures. Try again." },
      );
    })();
    return () => {
      live = false;
    };
  }, [range, router]);

  const currencies = useMemo(
    () => (load.phase === "ready" ? [...new Set(load.months.map((m) => m.currency))] : []),
    [load],
  );
  const shown = currency && currencies.includes(currency) ? currency : currencies[0];
  const months = load.phase === "ready" ? load.months.filter((m) => m.currency === shown) : [];
  const now = months[months.length - 1];

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28 lg:max-w-6xl lg:pt-8 lg:pb-12">
      <ScreenHeader
        title="Insights"
        subtitle="Where your money went, month by month."
        backHref="/wallet"
      />
      <div className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <ChoiceChips
            label="Period"
            options={RANGES}
            value={range}
            onChange={(v) => {
              setLoad({ phase: "loading" });
              setRange(v);
            }}
          />
          {currencies.length > 1 && (
            <ChoiceChips
              label="Currency"
              options={currencies.map((c) => ({ value: c, label: c }))}
              value={shown ?? null}
              onChange={setCurrency}
            />
          )}
        </div>

        {load.phase === "loading" && (
          <div role="status" className="grid gap-4 lg:grid-cols-3">
            <span className="sr-only">Loading…</span>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-hidden
                className="h-24 animate-pulse rounded-[var(--radius-l)] bg-surface-sunken"
              />
            ))}
          </div>
        )}
        {load.phase === "failed" && (
          <p
            role="alert"
            className="rounded-[var(--radius-l)] bg-danger-tint p-4 text-[15px] text-danger"
          >
            {load.message}
          </p>
        )}
        {load.phase === "ready" && !now && (
          <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-ink-muted">
            Nothing to show yet. Once money moves in your wallet, your months appear here.
          </p>
        )}
        {now && shown && (
          <>
            <section
              aria-label={`This month, ${monthLabel(now.month, true)}`}
              className="grid gap-4 sm:grid-cols-3"
            >
              {(
                [
                  ["Money in this month", now.moneyIn],
                  ["Money out this month", now.moneyOut],
                  ["Saved this month", now.savedNet],
                ] as const
              ).map(([label, amount]) => (
                <div
                  key={label}
                  className="grid gap-1 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
                >
                  <p className="text-[13px] text-ink-muted">{label}</p>
                  <Amount amount={amount} currency={shown} locale={locale} size="l" />
                </div>
              ))}
            </section>
            <div className="grid gap-5 lg:grid-cols-2">
              <section
                aria-labelledby="in-out"
                className="grid gap-3 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
              >
                <h2 id="in-out" className="font-display text-[18px] leading-6 font-semibold">
                  Money in and out
                </h2>
                <p className="text-[13px] text-ink-muted">
                  In: top-ups and circle payouts. Out: withdrawals and circle payments. Moving money
                  into your own savings is neither.
                </p>
                <InOutChart months={months} locale={locale} />
              </section>
              <section
                aria-labelledby="saved"
                className="grid gap-3 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
              >
                <h2 id="saved" className="font-display text-[18px] leading-6 font-semibold">
                  Saved in plans ({currencyName(shown)})
                </h2>
                <p className="text-[13px] text-ink-muted">
                  What your saving plans held at the end of each month.
                </p>
                {months.some((m) => m.endSavings !== "0") ? (
                  <SavingsLine months={months} locale={locale} />
                ) : (
                  <p className="grid min-h-40 place-items-center rounded-m bg-surface-sunken p-6 text-center text-[14px] text-ink-muted">
                    Nothing saved in plans in this period yet. Start a plan and its growth shows
                    here.
                  </p>
                )}
              </section>
            </div>
            <details className="rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift">
              <summary className="cursor-pointer text-[15px] font-semibold">
                See these figures as a table
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
                  <thead>
                    <tr className="text-[12px] tracking-[0.04em] text-ink-muted uppercase">
                      {[
                        "Month",
                        "Money in",
                        "Money out",
                        "Saved",
                        "Available at end",
                        "In plans at end",
                      ].map((h) => (
                        <th key={h} className="border-b border-line px-3 py-2 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m) => (
                      <tr key={m.month}>
                        <td className="border-b border-line px-3 py-2">
                          {monthLabel(m.month, true)}
                        </td>
                        {[m.moneyIn, m.moneyOut, m.savedNet, m.endAvailable, m.endSavings].map(
                          (v, i) => (
                            <td key={i} className="border-b border-line px-3 py-2">
                              <Amount amount={v} currency={shown} locale={locale} size="s" />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
    </main>
  );
}
