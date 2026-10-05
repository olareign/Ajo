/**
 * The shape of a screen while it loads: a title line, a hero card and two rows, pulsing softly. It
 * says "Loading…" to assistive technology and holds still when the device asks for less motion.
 */
export function ScreenSkeleton() {
  return (
    <div role="status" className="mx-auto grid w-full max-w-md gap-4 px-4 pt-6">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="h-8 w-40 animate-pulse rounded-m bg-surface-sunken" />
      <div
        aria-hidden
        className="h-44 animate-pulse rounded-[var(--radius-xl)] bg-surface-sunken"
      />
      <div aria-hidden className="h-20 animate-pulse rounded-[var(--radius-l)] bg-surface-sunken" />
      <div aria-hidden className="h-20 animate-pulse rounded-[var(--radius-l)] bg-surface-sunken" />
    </div>
  );
}
