import type { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeModeToggle } from "@/components/landing/ThemeModeToggle";

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
      className="pointer-events-none absolute -top-2 right-0 h-32 w-48 opacity-90 sm:hidden"
    >
      {beads.map((b) => (
        <circle key={`${b.cx}-${b.cy}`} cx={b.cx} cy={b.cy} r={b.r} className={b.className} />
      ))}
    </svg>
  );
}

/**
 * The frame every sign-in screen shares. On a phone: full height, the form on top, the footer line
 * at the bottom, as before. From a tablet up, the form stands alone in a narrow column with plenty
 * of room around it: the logo and the theme at the top, one quiet line at the foot, nothing else to
 * look at, so attention stays on what the person came to do.
 */
export function AuthScreen({
  children,
  footer,
}: Readonly<{ children: ReactNode; footer?: ReactNode }>) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:max-w-none sm:px-8 sm:pt-8 sm:pb-8">
      <BeadCorner />

      <div className="hidden items-center justify-between sm:flex">
        <Link href="/" aria-label="Àjọ home">
          <Logo width={84} />
        </Link>
        <ThemeModeToggle />
      </div>

      {/* The forms grow to the bottom on a phone (the button sits by the thumb); in the narrow
          column they keep their own height, so the button stays right under the fields. */}
      <div className="relative flex flex-1 flex-col sm:mx-auto sm:w-full sm:max-w-[400px] sm:justify-center sm:py-16 sm:[&_.mt-auto]:mt-0 sm:[&>*]:flex-none sm:[&>*_.flex-1]:flex-none">
        {children}
        {footer && (
          <div className="relative mt-6 text-center text-[15px] text-ink-muted sm:mt-10">
            {footer}
          </div>
        )}
      </div>

      <p className="hidden items-center justify-center gap-2 text-[12px] text-ink-muted sm:flex">
        <Lock aria-hidden className="size-3.5" />
        Encrypted connection. Àjọ will never ask for your PIN or codes.
      </p>
    </main>
  );
}
