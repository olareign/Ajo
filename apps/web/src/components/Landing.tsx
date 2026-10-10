"use client";

import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Fingerprint,
  Globe2,
  HandCoins,
  KeyRound,
  ListChecks,
  Orbit,
  PiggyBank,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  AmbientGlows,
  DotGridBackground,
  OrbitalRingsBackground,
} from "./landing/BackgroundDecorations";
import { DesktopDashboardMockup } from "./landing/DesktopDashboardMockup";
import { LandingFooter } from "./landing/LandingFooter";
import { LandingHeader } from "./landing/LandingHeader";

const STEPS: readonly { title: string; body: string; tag: string; Icon: LucideIcon }[] = [
  {
    title: "Start or join a circle",
    body: "Choose the amount, how often, and how many people. Friends first, or find one near your goal.",
    tag: "Custom Rules",
    Icon: Users,
  },
  {
    title: "Agree the order",
    body: "By a draw anyone can check, by picking turns, or by who joined first. Two members can swap.",
    tag: "Fair Rotation",
    Icon: Shuffle,
  },
  {
    title: "Everyone pays in",
    body: "On each date, every member's share is collected from their wallet, or from their bank by auto-debit.",
    tag: "Automated",
    Icon: HandCoins,
  },
  {
    title: "One person is paid",
    body: "The whole pot goes to whoever's turn it is, until everyone has had theirs.",
    tag: "Paid In Full Each Round",
    Icon: Orbit,
  },
];

const SAFETY: readonly { title: string; body: string; highlight: string; Icon: LucideIcon }[] = [
  {
    title: "Deposits cover a missed payment",
    body: "New members lock a small deposit. If someone can't pay, it covers them, so the round still pays out in full.",
    highlight: "Deposits cover a missed share",
    Icon: ShieldCheck,
  },
  {
    title: "Trust that's earned",
    body: "Every payment on time builds a member's record. Early turns go to people others can count on.",
    highlight: "Transparent reputation",
    Icon: ListChecks,
  },
  {
    title: "A second lock on your money",
    body: "Moving money needs your PIN and a code from an authenticator app, and every sign-in is recorded for you to see.",
    highlight: "PIN + authenticator app",
    Icon: KeyRound,
  },
  {
    title: "Real people, checked",
    body: "Everyone verifies who they are before money moves, so you know who you're saving with.",
    highlight: "Identity verified",
    Icon: Fingerprint,
  },
];

const PILLARS: readonly {
  title: string;
  desc: string;
  badge: string;
  Icon: LucideIcon;
  badgeColor: string;
}[] = [
  {
    title: "Automated Circle Rotations",
    desc: "A fair order set by a draw anyone can check, turn swaps when two members agree, and automatic payouts.",
    badge: "Circles",
    Icon: Orbit,
    badgeColor: "bg-primary-tint text-primary",
  },
  {
    title: "Deposit Reserve Shield",
    desc: "Newer members lock a security deposit, so a missed payment is covered and the round still pays out.",
    badge: "Deposit Protected",
    Icon: ShieldCheck,
    badgeColor: "bg-leaf-tint text-leaf",
  },
  {
    title: "Dual Currency Rails",
    desc: "Seamless Naira (₦) and British Pounds (£) multi-currency wallets for home and diaspora savers.",
    badge: "Global Rails",
    Icon: Globe2,
    badgeColor: "bg-oro-tint text-oro-ink",
  },
  {
    title: "Solo Goal Lockboxes",
    desc: "Put money aside on your schedule for rent, tuition, or emergency funds with automatic wallet returns.",
    badge: "Target Pots",
    Icon: PiggyBank,
    badgeColor: "bg-tertiary-tint text-tertiary",
  },
];

const FAQ: readonly { q: string; a: string }[] = [
  {
    q: "What is an èsúsú circle?",
    a: "A group of people who each pay the same amount on the same dates. Each round, the whole pot goes to one member, until everyone has had a turn. It's how many families and friends have always saved; Àjọ makes it organised and fair.",
  },
  {
    q: "What happens if someone doesn't pay?",
    a: "They get a short grace period and reminders. After that, their deposit covers the payment so the round pays out in full, their record shows it, and they can't join new circles for a while.",
  },
  {
    q: "Can I save on my own too?",
    a: "Yes. Saving plans take a set amount on your chosen days into a pot you can see grow, and pay it all back to your wallet at the end.",
  },
  {
    q: "Who is Àjọ for?",
    a: "People in Nigeria and the UK, and the diaspora saving with people back home. Your wallet is in your own currency.",
  },
  {
    q: "How do I get my money out?",
    a: "From your wallet to your bank account, with your PIN and authenticator code.",
  },
];

const band = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10";

export function Landing({ photos = [] }: Readonly<{ photos?: readonly string[] }>) {
  return (
    <div className="relative min-h-dvh bg-surface text-ink transition-colors duration-200 overflow-x-hidden">
      {/* Background SVG Decorations */}
      <DotGridBackground />
      <OrbitalRingsBackground />
      <AmbientGlows />

      {/* Shared Responsive Navigation Header */}
      <LandingHeader />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-28">
          <div className={`${band} text-center space-y-6 sm:space-y-8`}>
            {/* Eyebrow Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-tint/90 px-3.5 sm:px-4 py-1.5 text-xs font-bold text-primary shadow-xs backdrop-blur-xs">
                <Globe2 aria-hidden className="size-3.5 shrink-0" />
                <span>For Nigeria, the UK and the diaspora</span>
                <span className="size-1.5 rounded-full bg-leaf animate-pulse" />
              </span>
            </div>

            {/* Main Headline */}
            <div className="mx-auto max-w-4xl space-y-3 sm:space-y-4">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black tracking-[-0.035em] text-balance leading-[1.1]">
                Save together, <span className="text-primary">safely.</span>
              </h1>
              <p className="mx-auto max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-ink-muted">
                Àjọ turns the èsúsú circle you already trust into something organised and fair:
                everyone pays in on time, the order is clear, and deposits cover a missed payment.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-1 sm:pt-2">
              <Link
                href="/sign-up"
                className="inline-flex min-h-12 sm:min-h-13 items-center gap-2 rounded-m bg-primary px-6 sm:px-8 text-sm sm:text-base font-semibold text-on-primary shadow-lift transition-all hover:bg-primary-deep hover:translate-y-[-1px]"
              >
                Create your account
                <ArrowRight aria-hidden className="size-4.5" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 sm:min-h-13 items-center rounded-m border border-line-strong px-5 sm:px-7 text-sm sm:text-base font-semibold text-ink transition-colors hover:bg-surface-sunken"
              >
                Sign in
              </Link>
            </div>

            {/* Live Desktop App Workspace Mockup */}
            <div id="simulator" className="pt-8 sm:pt-10 lg:pt-14">
              <DesktopDashboardMockup photos={photos} />
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section
          id="features"
          aria-labelledby="features-title"
          className="relative border-t border-line bg-surface-sunken/40 py-16 sm:py-20 lg:py-24"
        >
          <div className={`${band} space-y-12 sm:space-y-14`}>
            <div className="mx-auto max-w-2xl text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Reliable Financial Architecture
              </span>
              <h2
                id="features-title"
                className="font-display text-3xl sm:text-4xl lg:text-[44px] leading-tight font-black tracking-[-0.025em]"
              >
                Built for confident collaborative & solo saving
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-ink-muted">
                Handle rotational circle payouts, automated debits, and locked goal pots from one
                calm, ledger-backed surface.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PILLARS.map(({ title, desc, badge, Icon, badgeColor }) => (
                <div
                  key={title}
                  className="group relative flex flex-col justify-between rounded-[20px] sm:rounded-[22px] border border-line bg-surface-raised p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:translate-y-[-2px] hover:border-primary/40"
                >
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-surface-sunken text-primary border border-line/60">
                        <Icon className="size-5" />
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badgeColor}`}
                      >
                        {badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-ink leading-snug">{title}</h3>
                    <p className="text-xs leading-relaxed text-ink-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how" aria-labelledby="how-title" className="relative py-16 sm:py-20 lg:py-24">
          <div className={`${band} space-y-12 sm:space-y-14`}>
            <div className="flex flex-col gap-2.5 sm:gap-3 lg:max-w-2xl">
              <span className="inline-flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                Transparent Process
              </span>
              <h2
                id="how-title"
                className="font-display text-3xl sm:text-4xl lg:text-[40px] leading-tight font-bold tracking-[-0.025em]"
              >
                How a circle works
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-ink-muted">
                Four steps, and everyone can see each one. No guesswork, no disputes, and total
                visibility.
              </p>
            </div>

            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ title, body, tag, Icon }, i) => (
                <li
                  key={title}
                  className="group relative flex flex-col justify-between rounded-[22px] sm:rounded-[24px] border border-line bg-surface-raised p-6 sm:p-7 shadow-lift transition-all hover:border-primary/40 hover:translate-y-[-2px]"
                >
                  <div className="grid gap-3.5 sm:gap-4">
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 sm:size-12 place-items-center rounded-2xl bg-primary-tint text-primary transition-transform group-hover:scale-105">
                        <Icon aria-hidden className="size-5 sm:size-6" />
                      </span>
                      <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-[11px] font-bold text-ink-muted">
                        Step 0{i + 1}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                        {tag}
                      </span>
                      <h3 className="text-lg sm:text-[19px] leading-snug font-bold text-ink mt-0.5">
                        {title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-[14px] leading-relaxed text-ink-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Safety & Risk Prevention Section */}
        <section
          id="safe"
          aria-labelledby="safe-title"
          className="relative border-t border-line bg-surface-sunken/40 py-16 sm:py-20 lg:py-24"
        >
          <div className={`${band} space-y-12 sm:space-y-14`}>
            <div className="flex flex-col gap-2.5 sm:gap-3 lg:max-w-2xl">
              <span className="inline-flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-leaf">
                Protected Architecture
              </span>
              <h2
                id="safe-title"
                className="font-display text-3xl sm:text-4xl lg:text-[40px] leading-tight font-bold tracking-[-0.025em]"
              >
                Built so one missed payment doesn&apos;t sink the round
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-ink-muted">
                The things that go wrong in a circle, handled before they happen.
              </p>
            </div>

            <ul className="grid gap-5 md:grid-cols-2">
              {SAFETY.map(({ title, body, highlight, Icon }) => (
                <li
                  key={title}
                  className="flex gap-4 sm:gap-5 rounded-[22px] sm:rounded-[24px] border border-line bg-surface-raised p-6 sm:p-7 shadow-lift transition-all hover:border-leaf/40"
                >
                  <span className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-2xl bg-leaf-tint text-leaf">
                    <Icon aria-hidden className="size-5 sm:size-6" />
                  </span>
                  <div className="grid gap-2">
                    <h3 className="text-lg sm:text-[19px] leading-snug font-bold text-ink">
                      {title}
                    </h3>
                    <p className="text-xs sm:text-[15px] leading-relaxed text-ink-muted">{body}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf pt-0.5">
                      <CheckCircle2 className="size-3.5" />
                      {highlight}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Solo Savings Section */}
        <section
          id="solo"
          aria-labelledby="solo-title"
          className="relative py-16 sm:py-20 lg:py-24"
        >
          <div className={`${band} grid items-center gap-10 lg:grid-cols-2 lg:gap-14`}>
            <div className="grid gap-4 sm:gap-5">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-oro-tint px-3 py-1 text-xs font-bold text-oro-ink">
                <Sparkles className="size-3.5" />
                Personal Lockbox
              </span>
              <h2
                id="solo-title"
                className="font-display text-3xl sm:text-4xl lg:text-[40px] leading-tight font-bold tracking-[-0.025em]"
              >
                And for saving on your own
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-ink-muted">
                Saving plans put a set amount aside on your chosen days, into a pot you can watch
                fill. Pause, top up, or finish, and it all comes back to your wallet.
              </p>
              <div className="pt-1 sm:pt-2">
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-11 sm:min-h-12 items-center gap-2 rounded-m bg-surface-raised border border-line px-5 text-sm font-semibold text-ink shadow-sm hover:bg-surface-sunken transition-colors"
                >
                  Start a solo savings plan
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            <ul className="grid gap-3 sm:gap-4">
              {(
                [
                  [
                    PiggyBank,
                    "A pot for each goal: rent, school fees, a trip home",
                    "Goal-based pots",
                  ],
                  [BellRing, "A reminder the day before each payment", "Proactive nudges"],
                  [
                    Users,
                    "Friends who save with you, and see the same circle you do",
                    "Shared milestones",
                  ],
                ] as const
              ).map(([Icon, text, tag]) => (
                <li
                  key={text}
                  className="flex items-center justify-between gap-4 rounded-[18px] sm:rounded-[20px] border border-line bg-surface-raised p-4 sm:p-5 shadow-lift"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                      <Icon aria-hidden className="size-4 sm:size-5" />
                    </span>
                    <span className="text-sm sm:text-[15px] font-semibold text-ink">{text}</span>
                  </div>
                  <span className="hidden sm:inline-block rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-ink-muted shrink-0">
                    {tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Questions / FAQ Section */}
        <section
          id="questions"
          aria-labelledby="questions-title"
          className="relative border-t border-line bg-surface-sunken/40 py-16 sm:py-20 lg:py-24"
        >
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            <div className="text-center space-y-2.5 sm:space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Help & Answers
              </span>
              <h2
                id="questions-title"
                className="font-display text-3xl sm:text-4xl lg:text-[44px] leading-tight font-black tracking-[-0.025em]"
              >
                Questions
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-ink-muted">
                Clear answers about safety, rotational order, fees, and operations.
              </p>
            </div>

            <div className="divide-y divide-line overflow-hidden rounded-[22px] sm:rounded-[26px] border border-line bg-surface-raised shadow-lift">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group transition-colors">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 text-base sm:text-[17px] font-bold text-ink hover:text-primary transition-colors [&::-webkit-details-marker]:hidden">
                    {q}
                    <ArrowRight
                      aria-hidden
                      className="size-4 sm:size-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-90 group-hover:text-primary"
                    />
                  </summary>
                  <p className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-[15px] leading-relaxed text-ink-muted">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final Conversion Banner */}
        <section aria-labelledby="start-title" className="py-16 sm:py-20 lg:py-28">
          <div className={`${band}`}>
            <div className="hero-card relative overflow-hidden rounded-[24px] sm:rounded-[32px] p-8 sm:p-10 lg:p-14 shadow-lift">
              <div className="pointer-events-none absolute -right-20 -bottom-20 size-80 rounded-full bg-oro/20 blur-[80px]" />

              <div className="relative z-10 flex flex-col justify-between gap-6 sm:gap-8 md:flex-row md:items-center">
                <div className="grid gap-2.5 sm:gap-3 max-w-xl">
                  <h2
                    id="start-title"
                    className="font-display text-2xl sm:text-3xl lg:text-[44px] leading-tight font-bold text-on-hero"
                  >
                    Your circle, organised.
                  </h2>
                  <p className="text-sm sm:text-base lg:text-[18px] text-on-hero-muted">
                    It takes a few minutes to set up. Invite your circle or start a goal on your own
                    today.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/sign-up"
                    className="inline-flex min-h-12 sm:min-h-14 items-center gap-2 rounded-m bg-oro px-6 sm:px-8 text-sm sm:text-base font-bold text-on-oro shadow-md transition-all hover:brightness-105 hover:scale-[1.02]"
                  >
                    Get started
                    <ArrowRight aria-hidden className="size-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Landing footer */}
      <LandingFooter />
    </div>
  );
}
