"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { useTheme, type ThemeChoice } from "@/lib/theme";

const CHOICES: readonly { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/** Light, dark, or whatever the device uses (the default). Remembered on this device. */
export function AppearancePicker() {
  const [choice, choose] = useTheme();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + CHOICES.length) % CHOICES.length;
    choose(CHOICES[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div className="grid gap-3 p-4">
      <p id="appearance-label" className="text-[15px] font-semibold">
        Appearance
      </p>
      <div
        role="radiogroup"
        aria-labelledby="appearance-label"
        className="grid grid-cols-3 gap-1 rounded-m bg-surface-sunken p-1"
      >
        {CHOICES.map(({ value, label, Icon }, index) => {
          const checked = value === choice;
          return (
            <button
              key={value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => choose(value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "flex min-h-10 items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-semibold transition-colors",
                checked
                  ? "bg-surface-raised text-primary shadow-lift"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-ink-muted">
        System follows your phone&apos;s light or dark setting.
      </p>
    </div>
  );
}
