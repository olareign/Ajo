"use client";

import { Delete } from "lucide-react";
import type { KeyboardEvent } from "react";

type Props = Readonly<{
  value: string;
  onChange: (value: string) => void;
  length: number;
  /** Names the keypad for screen readers. Use `labelledBy` instead when a visible label exists. */
  label?: string;
  labelledBy?: string;
}>;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/** A phone-style number pad. Also takes digits and Backspace from a physical keyboard. */
export function Keypad({ value, onChange, length, label, labelledBy }: Props) {
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
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="grid w-full grid-cols-3 gap-2 rounded-[var(--radius-l)] bg-surface-sunken p-2"
    >
      {KEYS.map((key, i) =>
        key === "" ? (
          <span key={i} aria-hidden />
        ) : key === "del" ? (
          <button
            key={i}
            type="button"
            aria-label="Delete last digit"
            onClick={back}
            className="grid h-14 place-items-center rounded-m text-ink-muted"
          >
            <Delete aria-hidden className="size-[22px]" />
          </button>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => press(key)}
            className="grid h-14 place-items-center rounded-m bg-surface-raised font-display text-[22px] font-semibold text-ink active:bg-primary-tint"
          >
            {key}
          </button>
        ),
      )}
    </div>
  );
}
