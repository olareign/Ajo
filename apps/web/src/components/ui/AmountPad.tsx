"use client";

import { useId } from "react";
import { Amount } from "@/components/ui/Amount";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Keypad } from "@/components/ui/Keypad";
import { toMinor } from "@/lib/money-flow";

type Props = Readonly<{
  /** Whole naira or pounds, as digits. */
  value: string;
  onChange: (value: string) => void;
  currency: string;
  locale: string;
  label: string;
  /** Whole-unit shortcuts shown as chips. */
  quick?: readonly number[];
}>;

const MAX_DIGITS = 9;

const digitsOf = (typed: string) =>
  typed.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);

/**
 * An amount, with shortcuts for the usual ones. A phone gets the big readout and a number pad; a
 * tablet or a desk, where a keyboard is at hand, gets a field to type in instead of the pad.
 */
export function AmountPad({ value, onChange, currency, locale, label, quick = [] }: Props) {
  const id = useId();
  const sign =
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency;
  return (
    <div className="grid gap-5">
      <div aria-live="polite" className="grid justify-items-center gap-1 py-2 md:hidden">
        <p className="text-[13px] font-semibold text-ink-muted">{label}</p>
        <Amount amount={toMinor(value)} currency={currency} locale={locale} size="xl" />
      </div>
      <div className="hidden gap-2 md:grid">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink-muted">
          {label}
        </label>
        <span className="flex h-[72px] items-center gap-3 rounded-[16px] border-2 border-line-strong bg-surface px-5 focus-within:border-primary">
          <span aria-hidden className="font-display text-[28px] font-bold text-ink-muted">
            {sign}
          </span>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={value === "" ? "" : new Intl.NumberFormat(locale).format(Number(value))}
            onChange={(e) => onChange(digitsOf(e.target.value))}
            className="w-0 min-w-0 flex-1 bg-transparent font-display text-[34px] leading-10 font-bold outline-none placeholder:text-ink-muted/50"
          />
        </span>
      </div>
      {quick.length > 0 && (
        <ChoiceChips
          label="Quick amounts"
          hideLabel
          options={quick.map((n) => ({
            value: String(n),
            label: new Intl.NumberFormat(locale, {
              style: "currency",
              currency,
              maximumFractionDigits: 0,
            }).format(n),
          }))}
          value={quick.map(String).includes(value) ? value : null}
          onChange={onChange}
        />
      )}
      <div className="md:hidden">
        <Keypad
          value={value}
          onChange={(next) => onChange(next.replace(/^0+/, ""))}
          length={MAX_DIGITS}
          label={`${label} number pad`}
        />
      </div>
    </div>
  );
}
