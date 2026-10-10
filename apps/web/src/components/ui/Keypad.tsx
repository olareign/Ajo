"use client";

import { Delete } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";

type Props = Readonly<{
  value: string;
  onChange: (value: string) => void;
  length: number;
  /** Names the keypad for screen readers. Use `labelledBy` instead when a visible label exists. */
  label?: string;
  labelledBy?: string;
}>;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/** Whether a key press belongs to something else on the page (a text field, or a shortcut). */
const elsewhere = (event: globalThis.KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return true;
  const target = event.target as HTMLElement | null;
  return (
    !!target &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
};

/**
 * A phone-style number pad. It also takes digits and Backspace from a physical keyboard: when it has
 * focus, and on a desktop straight away (while it is on screen and no text field is being typed in),
 * so a code or PIN can simply be typed.
 */
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
    event.stopPropagation();
  };

  const pad = useRef<HTMLDivElement>(null);
  const latest = useRef({ value, onChange, length });
  useLayoutEffect(() => {
    latest.current = { value, onChange, length };
  });
  useEffect(() => {
    const onWindowKey = (event: globalThis.KeyboardEvent) => {
      // Only a pad that is actually showing, and only keys nothing else wants.
      if (event.defaultPrevented || elsewhere(event) || !pad.current?.offsetParent) return;
      const now = latest.current;
      if (/^\d$/.test(event.key)) {
        if (now.value.length < now.length) now.onChange(now.value + event.key);
      } else if (event.key === "Backspace") {
        now.onChange(now.value.slice(0, -1));
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, []);

  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      ref={pad}
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
