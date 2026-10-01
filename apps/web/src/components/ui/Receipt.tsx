import type { ReactNode } from "react";
import { StatusPill } from "./StatusPill";

type Props = Readonly<{
  title: string;
  rows: readonly { label: string; value: ReactNode }[];
  total?: { label: string; value: ReactNode };
  stamp?: string;
  reference?: string;
}>;

/** What a money action will do (or did), in plain words, before the PIN is asked for. */
export function Receipt({ title, rows, total, stamp, reference }: Props) {
  return (
    <section
      aria-label={title}
      className="grid gap-4 rounded-l bg-surface-raised px-4 py-6 text-ink shadow-lift"
    >
      <header className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">{title}</p>
        {stamp && <StatusPill status="paid">{stamp}</StatusPill>}
      </header>
      {rows.length > 0 && (
        <dl className="grid gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 text-[15px] leading-[22px]">
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className="text-right font-semibold tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {total && (
        <div className="relative mt-2 flex items-baseline justify-between gap-4 border-t-2 border-dashed border-line pt-4 font-semibold">
          {/* Ticket notches cut in the page ground. */}
          <span
            aria-hidden
            className="absolute -top-[11px] -left-[26px] size-5 rounded-full bg-surface"
          />
          <span
            aria-hidden
            className="absolute -top-[11px] -right-[26px] size-5 rounded-full bg-surface"
          />
          <span>{total.label}</span>
          <strong className="font-display text-[22px] leading-7 tabular-nums">{total.value}</strong>
        </div>
      )}
      {reference && (
        <p className="text-xs text-ink-muted">
          Ref <span className="font-mono text-[13px] tracking-[0.04em] text-ink">{reference}</span>
        </p>
      )}
    </section>
  );
}
