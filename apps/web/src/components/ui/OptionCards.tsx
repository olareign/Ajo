"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export type CardOption = Readonly<{ value: string; title: string; detail?: string }>;

type Props = Readonly<{
  label: string;
  options: readonly CardOption[];
  value: string | null;
  onChange: (value: string) => void;
}>;

/** Big tappable choices for onboarding questions: one title, one calm line, a tick when chosen. */
export function OptionCards({ label, options, value, onChange }: Props) {
  const labelId = useId();
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="grid gap-3">
      <p id={labelId} className="sr-only">
        {label}
      </p>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-[72px] items-center gap-4 rounded-[var(--radius-l)] border-[1.5px] px-4 py-3 text-left transition-colors duration-150",
              checked
                ? "border-primary bg-primary-tint"
                : "border-line bg-surface-raised hover:bg-surface-sunken",
            )}
          >
            <span className="grow">
              <span className="block font-display text-[19px] leading-6 font-semibold">
                {option.title}
              </span>
              {option.detail && (
                <span className="mt-0.5 block text-[15px] leading-5 text-ink-muted">
                  {option.detail}
                </span>
              )}
            </span>
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                checked
                  ? "bg-primary text-on-primary"
                  : "shadow-[inset_0_0_0_2px_var(--line-strong)]",
              )}
            >
              {checked && <Check className="size-4" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
