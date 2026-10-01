"use client";

import { TriangleAlert } from "lucide-react";
import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> &
  Readonly<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
    error?: string;
  }>;

/** A labelled input; the hint sits under it and an error replaces the hint. */
export function TextField({ label, value, onChange, hint, error, className, ...props }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && !error && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-[52px] w-full rounded-m border-[1.5px] bg-surface-raised px-4 text-base text-ink transition-colors placeholder:text-ink-muted",
          "focus:border-adire focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          error ? "border-danger" : "border-line-strong",
        )}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs font-medium text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1 text-[13px] font-medium text-danger">
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
