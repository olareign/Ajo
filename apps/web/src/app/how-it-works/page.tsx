import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Orbit,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Shuffle,
} from "lucide-react";
import {
  AmbientGlows,
  DotGridBackground,
  OrbitalRingsBackground,
} from "@/components/landing/BackgroundDecorations";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";

export const metadata: Metadata = {
  title: "How It Works — Àjọ",
  description:
    "Learn how Àjọ organizes community èsúsú circles and solo goal savings with fair rotations, automated debits, and locked security deposits.",
};

const band = "mx-auto w-full max-w-7xl px-6 lg:px-10";

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-dvh bg-surface text-ink transition-colors duration-200 overflow-x-hidden">
      <DotGridBackground />
      <OrbitalRingsBackground />
      <AmbientGlows />

      <LandingHeader />

      <main className="relative z-10">
        {/* Page Hero */}
        <section className="pt-16 pb-16 lg:pt-20 lg:pb-24 text-center">
          <div className={`${band} space-y-6 max-w-4xl`}>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-tint/90 px-4 py-1.5 text-xs font-bold text-primary shadow-xs">
                <Orbit className="size-3.5" />
                <span>Complete Step-by-Step Guide</span>
              </span>
            </div>

            <h1 className="font-display text-[44px] leading-tight font-black tracking-tight sm:text-[56px] lg:text-[64px]">
              How Àjọ Works: <span className="text-primary">Circles & Solo Savings</span>
            </h1>

            <p className="mx-auto max-w-2xl text-[18px] leading-relaxed text-ink-muted">
              Whether you are pooling funds in an eight-person circle or locking away money for
              rent, Àjọ takes the friction and mistrust out of saving money.
            </p>
          </div>
        </section>

        {/* Deep Dive: Èsúsú Circles */}
        <section className="border-t border-line bg-surface-sunken/40 py-20 lg:py-24">
          <div className={`${band} space-y-16`}>
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Collaborative Rotations
              </span>
              <h2 className="font-display text-[36px] font-bold tracking-tight">
                The 4-Step Èsúsú Lifecycle
              </h2>
              <p className="text-base text-ink-muted">
                Every circle runs on a fair order everyone can see, with payments collected
                automatically.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-[24px] border border-line bg-surface-raised p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-tint text-primary font-bold">
                    01
                  </span>
                  <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-bold text-ink-muted">
                    Setup & Agreement
                  </span>
                </div>
                <h3 className="text-xl font-bold text-ink">Forming or Joining a Circle</h3>
                <p className="text-sm leading-relaxed text-ink-muted">
                  Choose the circle contribution (e.g. ₦50,000 or £100), frequency (weekly,
                  bi-weekly, or monthly), and number of members (typically 4 to 12). Invite friends
                  directly via private link or discover public verified circles tailored to your
                  financial goals.
                </p>
                <div className="pt-2 text-xs font-semibold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" />
                  <span>All members complete identity verification prior to entry</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-line bg-surface-raised p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-oro-tint text-oro-ink font-bold">
                    02
                  </span>
                  <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-bold text-ink-muted">
                    Turn Selection
                  </span>
                </div>
                <h3 className="text-xl font-bold text-ink">Transparent Payout Order</h3>
                <p className="text-sm leading-relaxed text-ink-muted">
                  The order is set by a draw anyone can check, members picking their turns, or the
                  order people joined. If your turn date conflicts with an unexpected expense, our
                  peer swap system lets two members agree to exchange their turns.
                </p>
                <div className="pt-2 text-xs font-semibold text-oro-ink flex items-center gap-1.5">
                  <Shuffle className="size-4" />
                  <span>Turn swaps when both members agree</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-line bg-surface-raised p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-leaf-tint text-leaf font-bold">
                    03
                  </span>
                  <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-bold text-ink-muted">
                    Automated Debits
                  </span>
                </div>
                <h3 className="text-xl font-bold text-ink">Scheduled Contributions</h3>
                <p className="text-sm leading-relaxed text-ink-muted">
                  No awkward reminder messages or tracking down members. On each contribution date,
                  shares are automatically debited from member wallets or linked bank accounts via
                  recurring direct debit mandates.
                </p>
                <div className="pt-2 text-xs font-semibold text-leaf flex items-center gap-1.5">
                  <Repeat className="size-4" />
                  <span>Automated bank mandates in Nigeria & the UK</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-line bg-surface-raised p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-tertiary-tint text-tertiary font-bold">
                    04
                  </span>
                  <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-bold text-ink-muted">
                    Disbursement
                  </span>
                </div>
                <h3 className="text-xl font-bold text-ink">Lump Sum Payout</h3>
                <p className="text-sm leading-relaxed text-ink-muted">
                  The full pot goes to that round&apos;s recipient. If a member still hasn&apos;t
                  paid after two days of retries, their locked deposit covers their share so the
                  round can pay out.
                </p>
                <div className="pt-2 text-xs font-semibold text-tertiary flex items-center gap-1.5">
                  <ShieldCheck className="size-4" />
                  <span>Missed shares covered by security deposits</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Solo Savings Section */}
        <section className="py-20 lg:py-24">
          <div className={`${band} grid items-center gap-14 lg:grid-cols-2`}>
            <div className="space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-oro-tint px-3 py-1 text-xs font-bold text-oro-ink">
                <PiggyBank className="size-3.5" />
                Solo Target Pots
              </span>
              <h2 className="font-display text-[38px] font-bold leading-tight">
                Save toward personal goals on your own terms
              </h2>
              <p className="text-base leading-relaxed text-ink-muted">
                Need to lock away money for rent, annual school fees, or a trip home? Àjọ Solo Pots
                let you establish recurring savings schedules into dedicated vaults that stay
                strictly separated from your daily spending balance.
              </p>
              <ul className="space-y-3 pt-2 text-sm font-semibold text-ink">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Customizable frequency: daily, weekly, or monthly top-ups</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Pause, top up, or end a plan early with your PIN</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Pays everything you saved back to your wallet at the end</span>
                </li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-line bg-surface-raised p-8 shadow-lift space-y-6">
              <h3 className="text-base font-bold text-ink">Popular Goal Vaults</h3>
              <div className="space-y-3">
                {[
                  {
                    name: "Annual House Rent",
                    target: "₦1,500,000",
                    progress: "75%",
                    color: "bg-primary",
                  },
                  {
                    name: "Tuition / School Fees",
                    target: "₦850,000",
                    progress: "90%",
                    color: "bg-oro",
                  },
                  {
                    name: "Diaspora Flight Home",
                    target: "£1,200",
                    progress: "60%",
                    color: "bg-tertiary",
                  },
                ].map((pot) => (
                  <div
                    key={pot.name}
                    className="rounded-xl border border-line bg-surface-sunken/60 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-ink">{pot.name}</span>
                      <span className="text-primary">{pot.target}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pot.color}`}
                        style={{ width: pot.progress }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-ink-muted font-medium">
                      <span>Automated debit active</span>
                      <span>{pot.progress} funded</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="pb-20 lg:pb-28">
          <div className={`${band}`}>
            <div className="hero-card rounded-[32px] p-10 lg:p-14 text-center space-y-6 shadow-lift">
              <h2 className="font-display text-[36px] font-bold text-on-hero lg:text-[44px]">
                Ready to start your circle?
              </h2>
              <p className="mx-auto max-w-xl text-base text-on-hero-muted">
                Create an account in 2 minutes. Start a circle with friends or set up your first
                goal pot.
              </p>
              <div className="flex justify-center gap-4 pt-2">
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-13 items-center gap-2 rounded-m bg-oro px-8 text-base font-bold text-on-oro shadow-md hover:brightness-105"
                >
                  Create account
                  <ArrowRight className="size-4.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
