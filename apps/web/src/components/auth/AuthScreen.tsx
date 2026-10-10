"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Globe2, Lock, Orbit, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeModeToggle } from "@/components/landing/ThemeModeToggle";
import {
  AmbientGlows,
  DotGridBackground,
  OrbitalRingsBackground,
} from "@/components/landing/BackgroundDecorations";

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
 * Redesigned AuthScreen:
 * - Mobile (< lg): Strict preservation of the native mobile ergonomics, spacing, and safe areas.
 * - Desktop (>= lg): Split-screen architecture with a dedicated form column and an inspiring
 *   institutional showcase panel on the right.
 */
export function AuthScreen({
  children,
  footer,
}: Readonly<{ children: ReactNode; footer?: ReactNode }>) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:max-w-none lg:flex-row lg:items-stretch lg:px-0 lg:pt-0 lg:pb-0">
      <BeadCorner />

      {/* Form Pane (Left half on desktop, Full screen on mobile) */}
      <div className="relative flex flex-1 flex-col justify-between lg:w-1/2 lg:flex-none lg:min-h-screen lg:px-10 xl:px-18 lg:py-8 xl:py-12 overflow-y-auto">
        {/* Desktop-only Top Navigation Bar */}
        <div className="hidden items-center justify-between pb-6 lg:flex">
          <Link href="/" aria-label="Àjọ home">
            <Logo width={96} />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeModeToggle />
            <Link
              href="/"
              className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
            >
              Back to overview
            </Link>
          </div>
        </div>

        {/* The Auth Content (ScreenHeader + Form) */}
        <div className="relative flex flex-1 flex-col justify-center max-w-md w-full mx-auto my-auto py-2 sm:py-4">
          {children}
        </div>

        {/* Footer Link Section */}
        {footer && (
          <div className="relative mt-6 text-center text-[15px] text-ink-muted lg:mt-8">
            {footer}
          </div>
        )}

        {/* Desktop Security Footnote */}
        <div className="hidden items-center justify-center gap-2 border-t border-line/60 pt-5 text-[11px] text-ink-muted lg:flex">
          <Lock className="size-3 text-leaf" />
          <span>Encrypted connection • PIN and authenticator app for money</span>
        </div>
      </div>

      {/* Showcase Panel (Right half on desktop, Hidden on mobile) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-l border-line bg-surface-sunken/70 p-10 lg:flex xl:p-14 lg:h-screen lg:sticky lg:top-0">
        <DotGridBackground />
        <OrbitalRingsBackground />
        <AmbientGlows />

        {/* Top Tag & Status */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-raised/80 px-3 py-1.5 text-xs font-bold text-primary shadow-xs backdrop-blur-xs">
            <Globe2 className="size-3.5" />
            <span>Nigeria, UK & Diaspora Rails</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-leaf">
            <span className="size-2 rounded-full bg-leaf animate-pulse" />
            Nigeria & UK
          </span>
        </div>

        {/* Center Showcase Card */}
        <div className="relative z-10 my-auto max-w-md space-y-5">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Institutional Trust
            </span>
            <h2 className="font-display text-2xl xl:text-3xl font-black tracking-tight text-ink leading-tight">
              Save together, with complete peace of mind.
            </h2>
            <p className="text-xs xl:text-sm leading-relaxed text-ink-muted">
              Àjọ takes the traditional èsúsú circle you already trust and backs it with automated
              bank debits and locked security deposits.
            </p>
          </div>

          {/* Mini Interactive Circle Card */}
          <div className="rounded-[20px] border border-line bg-surface-raised p-5 shadow-lift space-y-3.5">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary-tint text-primary font-bold">
                  <Orbit className="size-3.5" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-ink">Sample Circle of Eight</h3>
                  <p className="text-[10px] text-ink-muted">Round 3 of 8 • Weekly Rotation</p>
                </div>
              </div>
              <span className="font-display text-xs xl:text-sm font-bold text-primary">
                ₦400,000 / £800
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-ink-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-leaf shrink-0" />
                <span>Deposits cover a missed share</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-leaf shrink-0" />
                <span>Automatic collection • Clear payout order</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-leaf shrink-0" />
                <span>Multi-currency wallets: Naira (₦) & British Pounds (£)</span>
              </div>
            </div>
          </div>

          {/* How a round works, in one line */}
          <div className="rounded-xl border border-line/80 bg-surface-raised/70 p-3.5 text-[11px] leading-relaxed text-ink-muted backdrop-blur-xs">
            Each round, everyone pays the same amount and one member takes the whole pot, until
            everyone has had a turn.
          </div>
        </div>

        {/* Bottom Trust Row */}
        <div className="relative z-10 flex items-center justify-between text-xs text-ink-muted border-t border-line/60 pt-4">
          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <ShieldCheck className="size-3.5 text-leaf" />
            <span>Identity Verified Savers</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <Sparkles className="size-3.5 text-oro-ink" />
            <span>Deposit Shield Active</span>
          </div>
        </div>
      </div>
    </main>
  );
}
