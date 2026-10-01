"use client";

import { Delete } from "lucide-react";
import { useId, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

type Props = Readonly<{ value: string; onChange: (value: string) => void; length?: number; label: string }>;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/** On-screen keypad for the transaction PIN and authenticator codes; digits are never shown. */
export function PinPad({ value, onChange, length = 6, label }: Props) {
  const labelId = useId();
  const press = (digit: string) => {
    if (value.length < length) onChange(value + digit);
  };
  const back = () => onChange(value.slice(0, -1));
  const onKeyDown = (event: KeyboardEvent) => {
    if (/^\d$/.test(event.key)) press(event.key);
    else if (event.key === "Backspace") back();
    else return;
    event.preventDefault();
  };

  return (
    <div className="grid justify-items-center gap-6">
      <p id={labelId} className="text-[13px] font-semibold text-ink-muted">
        {label}
      </p>
      <div data-dots className="flex gap-3" aria-hidden>
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full transition-colors duration-150",
              i < value.length ? "bg-adire" : "shadow-[inset_0_0_0_2px_var(--line-strong)]",
            )}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {`${value.length} of ${length} digits entered`}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="grid grid-cols-[repeat(3,minmax(64px,88px))] gap-2 rounded-l bg-surface-sunken p-3"
      >
        {KEYS.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : key === "del" ? (
            <button
              key={i}
              type="button"
              aria-label="Delete last digit"
              onClick={back}
              className="grid h-16 place-items-center rounded-m text-ink-muted"
            >
              <Delete aria-hidden className="size-[22px]" />
            </button>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              className="grid h-16 place-items-center rounded-m bg-surface-raised font-display text-2xl font-semibold text-ink active:bg-adire-tint"
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
