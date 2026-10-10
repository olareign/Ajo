import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound, Scale, ShieldCheck, UserCheck } from "lucide-react";
import {
  AmbientGlows,
  DotGridBackground,
  OrbitalRingsBackground,
} from "@/components/landing/BackgroundDecorations";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";

export const metadata: Metadata = {
  title: "Safety & Trust Architecture — Àjọ",
  description:
    "Learn about Àjọ's security architecture: locked deposit pools, multi-factor authentication, transaction PIN security, and verified saver identities.",
};

const band = "mx-auto w-full max-w-7xl px-6 lg:px-10";

export default function SafetyPage() {
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
              <span className="inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-leaf-tint px-4 py-1.5 text-xs font-bold text-leaf shadow-xs">
                <ShieldCheck className="size-3.5" />
                <span>Built Around Deposits and Checks</span>
              </span>
            </div>

            <h1 className="font-display text-[44px] leading-tight font-black tracking-tight sm:text-[56px] lg:text-[64px]">
              Safety First: <span className="text-leaf">Built to Protect Your Circle</span>
            </h1>

            <p className="mx-auto max-w-2xl text-[18px] leading-relaxed text-ink-muted">
              Traditional communal savings often broke down when someone failed to pay. Àjọ rebuilds
              èsúsú around identity checks, locked security deposits, and a record every member can
              see.
            </p>
          </div>
        </section>

        {/* 4 Pillars of Protection */}
        <section className="border-t border-line bg-surface-sunken/40 py-20 lg:py-24">
          <div className={`${band} space-y-16`}>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-[26px] border border-line bg-surface-raised p-8 shadow-sm space-y-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-leaf-tint text-leaf">
                  <ShieldCheck className="size-6" />
                </div>
                <h2 className="text-2xl font-bold text-ink">The Deposit Reserve Pool</h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  Before joining a circle, members who are still building a record lock a security
                  deposit. If a participant encounters an unexpected bank disruption or fails to
                  fund their share on time, the deposit automatically steps in to cover the payment.
                </p>
                <div className="rounded-xl bg-surface-sunken p-4 text-xs space-y-2 border border-line">
                  <p className="font-bold text-ink">The Result:</p>
                  <p className="text-ink-muted">
                    The round still pays out. A member with a good record has no deposit, so if they
                    miss, that round pays what came in and our team chases the rest.
                  </p>
                </div>
              </div>

              <div className="rounded-[26px] border border-line bg-surface-raised p-8 shadow-sm space-y-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                  <KeyRound className="size-6" />
                </div>
                <h2 className="text-2xl font-bold text-ink">Two-Factor Authentication & PIN</h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  Moving money out of your wallet requires both your secret 6-digit transaction PIN
                  and a time-based one-time password (TOTP) from an authenticator app (Google
                  Authenticator, 1Password, or Apple Keychain).
                </p>
                <div className="rounded-xl bg-surface-sunken p-4 text-xs space-y-2 border border-line">
                  <p className="font-bold text-ink">Session Audit Trails:</p>
                  <p className="text-ink-muted">
                    Every active device, IP address, and login attempt is logged. You can revoke
                    other sessions remotely in one click.
                  </p>
                </div>
              </div>

              <div className="rounded-[26px] border border-line bg-surface-raised p-8 shadow-sm space-y-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-oro-tint text-oro-ink">
                  <UserCheck className="size-6" />
                </div>
                <h2 className="text-2xl font-bold text-ink">Verified Saver Identities</h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  Everyone verifies who they are (BVN in Nigeria; a passport or driving licence in
                  the UK) before money moves. Anonymous accounts and bad actors are prohibited from
                  entering monetary circles.
                </p>
                <div className="rounded-xl bg-surface-sunken p-4 text-xs space-y-2 border border-line">
                  <p className="font-bold text-ink">Reputation Ledger:</p>
                  <p className="text-ink-muted">
                    Every on-time contribution boosts a saver&apos;s internal trust tier, granting
                    access to higher-value circles and preferred early payout turns.
                  </p>
                </div>
              </div>

              <div className="rounded-[26px] border border-line bg-surface-raised p-8 shadow-sm space-y-5">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-tertiary-tint text-tertiary">
                  <Scale className="size-6" />
                </div>
                <h2 className="text-2xl font-bold text-ink">Guarding Your Sign-In</h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  A new device signing in gets you an email, too many wrong passwords lock the
                  account for a while, and sign-up is protected by a bot check.
                </p>
                <div className="rounded-xl bg-surface-sunken p-4 text-xs space-y-2 border border-line">
                  <p className="font-bold text-ink">We Never Ask:</p>
                  <p className="text-ink-muted">
                    Àjọ will never ask for your password, PIN or authenticator codes. Anyone who
                    does isn&apos;t us.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-28">
          <div className={`${band}`}>
            <div className="hero-card rounded-[32px] p-10 lg:p-14 text-center space-y-6 shadow-lift">
              <h2 className="font-display text-[36px] font-bold text-on-hero lg:text-[44px]">
                Save with confidence and peace of mind
              </h2>
              <p className="mx-auto max-w-xl text-base text-on-hero-muted">
                Save with people you trust, with deposits, checks and a clear record behind you.
              </p>
              <div className="flex justify-center gap-4 pt-2">
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-13 items-center gap-2 rounded-m bg-oro px-8 text-base font-bold text-on-oro shadow-md hover:brightness-105"
                >
                  Create verified account
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
