"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { Keypad } from "./Keypad";

type Props = Readonly<{
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label: string;
}>;

/** On-screen keypad for the transaction PIN and authenticator codes; digits are never shown. */
export function PinPad({ value, onChange, length = 6, label }: Props) {
  const labelId = useId();
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
              i < value.length ? "bg-primary" : "shadow-[inset_0_0_0_2px_var(--line-strong)]",
            )}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {`${value.length} of ${length} digits entered`}
      </p>
      <Keypad value={value} onChange={onChange} length={length} labelledBy={labelId} />
    </div>
  );
}
