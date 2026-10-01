"use client";

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

export function TextField({ label, value, onChange, hint, error, className, ...props }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-field border bg-surface px-4 text-base outline-none transition-colors",
            "focus:border-brand-600",
            error ? "border-danger" : "border-line",
            hint && "pr-20",
          )}
          {...props}
        />
        {hint && (
          <span
            id={hintId}
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-danger/80"
          >
            {hint}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
