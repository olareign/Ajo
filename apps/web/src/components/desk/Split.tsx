import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A list page from a tablet up: the page's own content in a wide main column, and a narrow side
 * column beside it, kept in view while the list scrolls. `aside` is what the page needs anywhere
 * (its actions): on a phone it follows the content, as before. `note` (how this works) only
 * exists where there is room, so a phone never scrolls past extra reading.
 */
export function Split({
  aside,
  note,
  children,
}: Readonly<{ aside?: ReactNode; note?: ReactNode; children: ReactNode }>) {
  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-6">{children}</div>
      {(aside || note) && (
        <aside className="grid gap-6 md:sticky md:top-28">
          {aside}
          {note && <div className="hidden md:block">{note}</div>}
        </aside>
      )}
    </div>
  );
}

export type Fact = Readonly<{ label: string; value: ReactNode; note?: ReactNode }>;

/**
 * A page's few headline figures in one quiet card: a label, the figure, and a line of context.
 * One card, not a tile each, so a page reads calm. Two to a row on a phone, all in one row wider.
 */
export function Facts({
  label,
  facts,
  className,
}: Readonly<{ label: string; facts: readonly Fact[]; className?: string }>) {
  return (
    <section
      aria-label={label}
      className={cn("rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift", className)}
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {facts.map((f) => (
          <div key={f.label} className="grid content-start gap-1">
            <dt className="text-[13px] text-ink-muted">{f.label}</dt>
            <dd className="font-display text-[20px] leading-7 font-bold">{f.value}</dd>
            {f.note && <dd className="text-[13px] text-ink-muted">{f.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}
