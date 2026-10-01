"use client";

import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> &
  Readonly<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
    error?: string;
  }>;

/**
 * A labelled input; the hint sits under it and an error replaces the hint.
 * Password fields get an eye button to show or hide what was typed.
 */
export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  className,
  type,
  ...props
}: Props) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint && !error && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...(isPassword && revealed
            ? { autoCapitalize: "none", spellCheck: false, autoCorrect: "off" }
            : {})}
          className={cn(
            "min-h-14 w-full rounded-m border-[1.5px] bg-surface-sunken px-4 text-base text-ink transition-colors placeholder:text-ink-muted",
            "focus:border-adire focus:bg-surface-raised focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            isPassword && "pr-14",
            error ? "border-danger" : "border-transparent",
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-m text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            {revealed ? (
              <EyeOff aria-hidden className="size-5" />
            ) : (
              <Eye aria-hidden className="size-5" />
            )}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs font-medium text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-[13px] font-medium text-danger"
        >
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
