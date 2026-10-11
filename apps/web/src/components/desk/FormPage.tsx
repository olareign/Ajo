import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PAGE } from "@/lib/page";

/**
 * A form page. A phone gets the form alone, as before. A desk keeps the form at a width that is easy
 * to fill in, on the left, and fills the rest with `aside`: a short note about this step, kept in
 * view while the form scrolls.
 */
export function FormPage({
  aside,
  children,
}: Readonly<{ aside?: ReactNode; children: ReactNode }>) {
  return (
    <main className={PAGE}>
      <div className="lg:grid lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,600px)_minmax(0,1fr)]">
        <div className="min-w-0">{children}</div>
        {aside && <aside className="hidden lg:sticky lg:top-28 lg:block">{aside}</aside>}
      </div>
    </main>
  );
}

/** The note beside a form: a title, a few plain facts about this step, and where to go next. */
export function AsideCard({
  Icon,
  title,
  points,
  link,
}: Readonly<{
  Icon: LucideIcon;
  title: string;
  points: readonly string[];
  link?: Readonly<{ href: string; label: string }>;
}>) {
  return (
    <section
      aria-label={title}
      className="grid gap-5 rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-lift xl:p-8"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-primary-tint text-primary">
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="font-display text-[22px] leading-7 font-bold">{title}</h2>
      <ul className="grid gap-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-[15px] leading-6 text-ink-muted">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
            {point}
          </li>
        ))}
      </ul>
      {link && (
        <Link
          href={link.href}
          className="inline-flex w-fit items-center gap-1 text-[15px] font-semibold text-primary hover:underline"
        >
          {link.label}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      )}
    </section>
  );
}
