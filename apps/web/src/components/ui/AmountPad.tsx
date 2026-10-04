"use client";

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

/** An amount typed on a number pad, shown big, with shortcuts for the usual ones. */
export function AmountPad({ value, onChange, currency, locale, label, quick = [] }: Props) {
  return (
    <div className="grid gap-5">
      <div aria-live="polite" className="grid justify-items-center gap-1 py-2">
        <p className="text-[13px] font-semibold text-ink-muted">{label}</p>
        <Amount amount={toMinor(value)} currency={currency} locale={locale} size="xl" />
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
      <Keypad
        value={value}
        onChange={(next) => onChange(next.replace(/^0+/, ""))}
        length={MAX_DIGITS}
        label={`${label} number pad`}
      />
    </div>
  );
}
