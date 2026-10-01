"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export type ChipOption = Readonly<{ value: string; label: string }>;

type Props = Readonly<{
  label: string;
  options: readonly ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Hide the visible label when the screen heading already says it. */
  hideLabel?: boolean;
}>;

/** Pill-shaped single choice, as used for amounts, frequency and duration in the designs. */
export function ChoiceChips({ label, options, value, onChange, hideLabel = false }: Props) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <p
        id={labelId}
        className={cn(
          "mb-3 font-display text-[21px] leading-7 font-semibold",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const checked = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (selectedIndex === -1 && index === 0) ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "min-h-11 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors duration-150",
                checked
                  ? "border-adire bg-adire text-on-adire"
                  : "border-line-strong bg-surface-raised text-ink hover:bg-adire-tint",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
