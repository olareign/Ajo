import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import {
  AmbientGlows,
  DotGridBackground,
  OrbitalRingsBackground,
} from "@/components/landing/BackgroundDecorations";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";

export const metadata: Metadata = {
  title: "About Us — Àjọ",
  description:
    "The story behind Àjọ: Honoring African community rotating savings traditions with modern financial infrastructure for Nigeria, the UK, and the diaspora.",
};

const band = "mx-auto w-full max-w-7xl px-6 lg:px-10";

export default function AboutPage() {
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
                <Heart className="size-3.5" />
                <span>Our Heritage & Purpose</span>
              </span>
            </div>

            <h1 className="font-display text-[44px] leading-tight font-black tracking-tight sm:text-[56px] lg:text-[64px]">
              Honoring Tradition, <span className="text-primary">Engineered for Tomorrow</span>
            </h1>

            <p className="mx-auto max-w-2xl text-[18px] leading-relaxed text-ink-muted">
              For generations across West Africa, communities built wealth together through
              <em> èsúsú</em>, <em>àjọ</em>, and <em>adashe</em>. We took the heart of this mutual
              trust and equipped it with modern banking technology.
            </p>
          </div>
        </section>

        {/* The Story & Mission */}
        <section className="border-t border-line bg-surface-sunken/40 py-20 lg:py-24">
          <div className={`${band} grid gap-12 lg:grid-cols-2 lg:items-center`}>
            <div className="space-y-6">
              <h2 className="font-display text-[36px] font-bold tracking-tight">
                Why We Built Àjọ
              </h2>
              <p className="text-base leading-relaxed text-ink-muted">
                Rotational savings have helped millions of families buy property, pay school fees,
                and survive economic storms. But informal groups were always vulnerable to human
                friction: someone falling ill, someone refusing to pay after collecting their lump
                sum, or a treasurer mismanaging the ledger.
              </p>
              <p className="text-base leading-relaxed text-ink-muted">
                Àjọ tackles those weak spots: automated bank mandates, real-time ledger
                transparency, and a mandatory <strong>Deposit Reserve Shield</strong> that covers a
                missed payment.
              </p>
            </div>

            <div className="rounded-[28px] border border-line bg-surface-raised p-8 shadow-lift space-y-6">
              <h3 className="text-lg font-bold text-ink">Our Core Commitments</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary font-bold">
                    1
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-ink">Deposits Behind Every Round</h4>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Newer members lock a security deposit that covers a missed payment, so the
                      round can still pay out.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-oro-tint text-oro-ink font-bold">
                    2
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-ink">The Diaspora Bridge</h4>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Saving together across Lagos and London is now frictionless. Members hold
                      wallets in their local currency (₦ or £), with an estimate in £, $ and €.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-leaf-tint text-leaf font-bold">
                    3
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-ink">An Open Record</h4>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Every contribution, swap, and disbursement is permanently recorded on an
                      unchangeable ledger, and members see who has paid in their circle.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Diaspora Banner */}
        <section className="py-20 lg:py-28">
          <div className={`${band}`}>
            <div className="hero-card rounded-[32px] p-10 lg:p-14 text-center space-y-6 shadow-lift">
              <h2 className="font-display text-[36px] font-bold text-on-hero lg:text-[44px]">
                Built for home and diaspora savers
              </h2>
              <p className="mx-auto max-w-xl text-base text-on-hero-muted">
                Join a community of savers across Nigeria and the UK who hold their circles to the
                highest standard.
              </p>
              <div className="flex justify-center gap-4 pt-2">
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-13 items-center gap-2 rounded-m bg-oro px-8 text-base font-bold text-on-oro shadow-md hover:brightness-105"
                >
                  Join Àjọ today
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
