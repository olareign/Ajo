import Link from "next/link";
import { join } from "node:path";
import type { ReactNode } from "react";
import { CircleRing } from "@/components/CircleRing";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/public/ThemeToggle";
import { listPeoplePhotos } from "@/lib/people-photos";
import { SAMPLE_CIRCLE } from "@/lib/sample-circle";

/** A few beads from the circle, cropped by the corner of the screen: decoration, never information. */
function BeadCorner() {
  const beads = [
    { cx: 150, cy: 18, r: 9, className: "fill-tertiary-tint" },
    { cx: 120, cy: 40, r: 7, className: "fill-tertiary" },
    { cx: 168, cy: 58, r: 11, className: "fill-primary" },
    { cx: 100, cy: 72, r: 5, className: "fill-tertiary-tint" },
    { cx: 140, cy: 92, r: 8, className: "fill-primary-tint" },
    { cx: 176, cy: 112, r: 6, className: "fill-tertiary-tint" },
  ];
  return (
    <svg
      data-corner=""
      aria-hidden="true"
      viewBox="0 0 200 140"
      className="pointer-events-none absolute -top-2 right-0 h-32 w-48 opacity-90 lg:hidden"
    >
      {beads.map((b) => (
        <circle key={`${b.cx}-${b.cy}`} cx={b.cx} cy={b.cy} r={b.r} className={b.className} />
      ))}
    </svg>
  );
}

/**
 * The frame every sign-in screen shares. On a phone: full height, the form on top, the footer line at
 * the bottom. On a desk: the form on the left, and on the right the circle the person is coming to
 * save with, in the money-hero colours, with three plain lines about what Àjọ does.
 */
export function AuthScreen({
  children,
  footer,
}: Readonly<{ children: ReactNode; footer?: ReactNode }>) {
  const photos = listPeoplePhotos(join(process.cwd(), "public", "people"));
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:px-6 lg:pt-8">
        <BeadCorner />
        <div className="mb-6 hidden items-center justify-between lg:flex">
          <Link href="/" aria-label="Àjọ home">
            <Logo width={76} />
          </Link>
          <ThemeToggle />
        </div>
        <div className="relative flex flex-1 flex-col lg:justify-center">{children}</div>
        {footer && (
          <div className="relative mt-6 text-center text-[15px] text-ink-muted">{footer}</div>
        )}
      </main>
      <aside
        aria-hidden
        className="hero-card sticky top-0 hidden h-dvh flex-col justify-center gap-10 overflow-hidden px-12 lg:flex xl:px-20"
      >
        <CircleRing
          members={SAMPLE_CIRCLE.map((m, i) => ({ ...m, photo: photos[i] }))}
          recipient={2}
          center={{ label: "THIS ROUND", value: "₦400,000" }}
          size={300}
          className="self-start"
        />
        <div className="grid max-w-md gap-4">
          <p className="font-display text-[40px] leading-[1.05] font-bold tracking-[-0.03em]">
            Save together, safely.
          </p>
          <ul className="grid gap-2 text-[16px] leading-6 text-on-hero-muted">
            <li>Everyone pays in on the same day.</li>
            <li>The whole pot goes to one person each round.</li>
            <li>New members&apos; deposits cover a missed payment.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
