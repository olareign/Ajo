"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Figure = Readonly<{ label: string; value: ReactNode; note?: ReactNode }>;

/**
 * The one summary a page opens with: a few real figures in the primary green, the same band on
 * every page so a person always knows where to look first. Two to a row on a phone, all in one
 * row wider. Values that are money are passed as `<Amount tone="hero" />`.
 */
export function SummaryBand({
  label,
  heading,
  figures,
  className,
}: Readonly<{
  label: string;
  /** A small line over the figures, such as the currency they are in. */
  heading?: string;
  figures: readonly Figure[];
  className?: string;
}>) {
  return (
    <section
      aria-label={label}
      className={cn(
        "hero-card overflow-hidden rounded-[var(--radius-xl)] p-5 shadow-lift md:p-6",
        className,
      )}
    >
      {heading && (
        <h2 className="mb-4 text-[13px] font-semibold tracking-[0.04em] text-on-hero-muted uppercase">
          {heading}
        </h2>
      )}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
        {figures.map((f) => (
          <div key={f.label} className="grid min-w-0 content-start gap-1">
            <dt className="text-[13px] font-semibold tracking-[0.02em] text-on-hero-muted">
              {f.label}
            </dt>
            <dd className="font-display text-[22px] leading-7 font-bold text-on-hero md:text-[26px] md:leading-8">
              {f.value}
            </dd>
            {f.note && <dd className="text-[13px] text-on-hero-muted">{f.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

/** A list or grid choice, as two icon buttons that say which one is on. */
export function ViewSwitch<T extends string>({
  label,
  value,
  onChange,
  options,
}: Readonly<{
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: readonly Readonly<{ id: T; label: string; icon: ReactNode }>[];
}>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-12 shrink-0 items-center gap-1 rounded-[14px] border border-line-strong bg-surface-raised p-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-label={o.label}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "grid size-10 place-items-center rounded-[10px] transition-colors",
            value === o.id
              ? "bg-primary text-on-primary"
              : "text-ink-muted hover:bg-surface-sunken",
          )}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

/** A short row of filter tabs with counts; the chosen one is filled. */
export function FilterTabs<T extends string>({
  label,
  value,
  onChange,
  tabs,
}: Readonly<{
  label: string;
  value: T;
  onChange: (next: T) => void;
  tabs: readonly Readonly<{ id: T; label: string; count?: number }>[];
}>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-colors",
            value === t.id
              ? "bg-primary text-on-primary"
              : "border border-line bg-surface-raised text-ink hover:bg-surface-sunken",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-2 text-[12px]",
                value === t.id ? "bg-white/20" : "bg-surface-sunken text-ink-muted",
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
