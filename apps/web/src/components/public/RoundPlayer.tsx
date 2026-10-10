"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { CircleRing, type RingMember } from "@/components/CircleRing";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money-format";
import { SAMPLE_CIRCLE } from "@/lib/sample-circle";

const PLANS = {
  NGN: { locale: "en-NG", amounts: [10_000, 25_000, 50_000], start: 1 },
  GBP: { locale: "en-GB", amounts: [50, 100, 250], start: 1 },
} as const;
type Currency = keyof typeof PLANS;

/** In this round of the example, one member's wallet came up short and their deposit paid. */
const COVERED_ROUND = 5;
const COVERED_MEMBER = 6;

const money = (whole: number, currency: Currency) =>
  formatMoney({ amount: String(whole * 100), currency }, PLANS[currency].locale);

const firstName = (name: string) => name.split(" ")[0]!;

/**
 * An example circle you can step through: pick what each person pays, then move round by round and
 * watch the pot go to the next person, with a receipt of what came in and went out. Nothing moves
 * on its own; it only changes when you press something.
 */
export function RoundPlayer({ photos = [] }: Readonly<{ photos?: readonly string[] }>) {
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [amount, setAmount] = useState<number>(PLANS.NGN.amounts[PLANS.NGN.start]);
  const [round, setRound] = useState(3);

  const size = SAMPLE_CIRCLE.length;
  const recipient = round - 1;
  const covered = round === COVERED_ROUND;
  const members: RingMember[] = SAMPLE_CIRCLE.map((m, i) => ({
    name: m.name,
    photo: photos[i],
    status: covered && i === COVERED_MEMBER ? "covered" : "paid",
  }));
  const pot = amount * size;
  const who = SAMPLE_CIRCLE[recipient]!.name;

  function pickCurrency(next: Currency) {
    setCurrency(next);
    setAmount(PLANS[next].amounts[PLANS[next].start]);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label="Currency"
          className="flex rounded-full bg-surface-sunken p-1"
        >
          {(Object.keys(PLANS) as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={currency === c}
              onClick={() => pickCurrency(c)}
              className="rounded-full px-3.5 py-1.5 text-[14px] font-semibold text-ink-muted aria-checked:bg-surface-raised aria-checked:text-ink aria-checked:shadow-lift"
            >
              {c === "NGN" ? "₦ Naira" : "£ Pounds"}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Each person pays" className="flex gap-2">
          {PLANS[currency].amounts.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={amount === a}
              onClick={() => setAmount(a)}
              className="rounded-full px-3.5 py-1.5 text-[14px] font-semibold tabular-nums text-ink-muted shadow-[inset_0_0_0_1.5px_var(--line)] aria-checked:bg-primary aria-checked:text-on-primary aria-checked:shadow-none"
            >
              {money(a, currency)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-center gap-6 sm:grid-cols-[248px_minmax(13rem,1fr)]">
        <CircleRing
          members={members}
          recipient={recipient}
          title={`An example circle of ${size}, round ${round}`}
          center={{ label: `ROUND ${round} OF ${size}`, value: money(pot, currency) }}
          size={248}
          className="mx-auto"
        />

        <div className="receipt-shadow">
          <figure
            aria-labelledby="receipt-title"
            className="receipt grid gap-3 bg-surface-raised px-5 pt-7 pb-8 font-mono text-[13px] leading-5"
          >
            <figcaption id="receipt-title" className="flex justify-between gap-3 text-ink-muted">
              <span>
                ROUND {round} OF {size}
              </span>
              <span>EXAMPLE</span>
            </figcaption>
            <div aria-hidden className="border-t border-dashed border-line-strong" />
            <dl className="grid gap-1.5" aria-live="polite">
              <div className="flex justify-between gap-3">
                <dt>Paid in</dt>
                <dd className="tabular-nums">
                  {size} × {money(amount, currency)}
                </dd>
              </div>
              {covered && (
                <div className="flex justify-between gap-3 text-tertiary">
                  <dt>{firstName(SAMPLE_CIRCLE[COVERED_MEMBER]!.name)}&apos;s deposit</dt>
                  <dd className="tabular-nums">covered {money(amount, currency)}</dd>
                </div>
              )}
              <div aria-hidden className="my-1 border-t border-dashed border-line-strong" />
              <div className="flex justify-between gap-3 font-sans text-[15px] font-semibold">
                <dt>To {who}</dt>
                <dd className="tabular-nums">{money(pot, currency)}</dd>
              </div>
            </dl>
            <p className="font-sans text-[13px] leading-5 text-ink-muted">
              {covered
                ? `${firstName(SAMPLE_CIRCLE[COVERED_MEMBER]!.name)}'s wallet was short. Their deposit paid their share, so ${firstName(who)} still got the full pot.`
                : round === size
                  ? "Last round: everyone has had the pot once, and deposits go back."
                  : `Next round, it's ${firstName(SAMPLE_CIRCLE[round]!.name)}'s turn.`}
            </p>
          </figure>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setRound((r) => Math.max(1, r - 1))}
          disabled={round === 1}
          aria-label="Previous round"
          className="grid size-10 place-items-center rounded-full shadow-[inset_0_0_0_1.5px_var(--line-strong)] disabled:opacity-40"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <ol className="flex flex-1 justify-between gap-1" aria-label="Rounds">
          {SAMPLE_CIRCLE.map((m, i) => (
            <li key={m.name} className="flex-1">
              <button
                type="button"
                onClick={() => setRound(i + 1)}
                aria-label={`Round ${i + 1}: ${m.name}`}
                aria-current={round === i + 1 ? "step" : undefined}
                className="grid h-10 w-full place-items-center"
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-full rounded-full transition-colors",
                    i + 1 < round ? "bg-primary" : i + 1 === round ? "bg-oro" : "bg-line",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setRound((r) => Math.min(size, r + 1))}
          disabled={round === size}
          aria-label="Next round"
          className="grid size-10 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-40"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  );
}
