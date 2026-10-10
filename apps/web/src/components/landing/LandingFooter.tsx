"use client";

import { Globe2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const band = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10";

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface-sunken/60 pt-14 sm:pt-16 pb-12 text-ink transition-colors">
      <div className={`${band} space-y-12 sm:space-y-14`}>
        {/* Main 4-Column Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Column 1: Brand & Identity (2 cols on lg) */}
          <div className="space-y-5 lg:col-span-2">
            <Link href="/" aria-label="Àjọ home" className="inline-block">
              <Logo width={105} />
            </Link>

            <p className="max-w-sm text-[14px] leading-relaxed text-ink-muted">
              Savings circles and solo saving for Nigeria, the UK, and the diaspora: automated
              rounds, clear payout order, and security deposits that cover a missed payment.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2 rounded-full border border-line bg-surface-raised px-3 py-1.5 text-[12px] font-semibold text-ink shadow-xs">
                <span className="size-2 rounded-full bg-leaf animate-pulse" />
                <span>Nigeria · United Kingdom</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface-raised px-3 py-1.5 text-[12px] font-semibold text-ink-muted shadow-xs">
                <Globe2 className="size-3.5 text-primary" />
                <span>₦ NGN & £ GBP Rails</span>
              </div>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Product</h3>
            <ul className="space-y-2.5 text-[14px] text-ink-muted">
              <li>
                <Link href="/how-it-works" className="transition-colors hover:text-primary">
                  Èsúsú Circles
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="transition-colors hover:text-primary">
                  Solo Goal Pots
                </Link>
              </li>
              <li>
                <Link href="/safety" className="transition-colors hover:text-primary">
                  Deposit Reserve Shield
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="transition-colors hover:text-primary">
                  Dual Currency Multi-Wallet
                </Link>
              </li>
              <li>
                <Link href="/#simulator" className="transition-colors hover:text-primary">
                  Interactive Simulator
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company & Platform */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Company</h3>
            <ul className="space-y-2.5 text-[14px] text-ink-muted">
              <li>
                <Link href="/about" className="transition-colors hover:text-primary">
                  About Àjọ
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="transition-colors hover:text-primary">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/safety" className="transition-colors hover:text-primary">
                  Safety & Trust Architecture
                </Link>
              </li>
              <li>
                <Link href="/help" className="transition-colors hover:text-primary">
                  Help Center & FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Security */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Legal & Trust</h3>
            <ul className="space-y-2.5 text-[14px] text-ink-muted">
              <li>
                <Link href="/terms" className="transition-colors hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/safety" className="transition-colors hover:text-primary">
                  Security Standards
                </Link>
              </li>
              <li>
                <Link href="/help" className="transition-colors hover:text-primary">
                  Dispute Resolution
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Security & Assurance Badges */}
        <div className="grid gap-4 rounded-2xl border border-line bg-surface-raised p-5 sm:grid-cols-3 text-xs text-ink-muted">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-leaf-tint text-leaf">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="font-bold text-ink">Deposit Protection</p>
              <p className="text-[11px]">Backed by mandatory deposit pool</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
              <Lock className="size-4" />
            </span>
            <div>
              <p className="font-bold text-ink">Two Locks on Your Money</p>
              <p className="text-[11px]">Transaction PIN & authenticator app</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-oro-tint text-oro-ink">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-bold text-ink">Verified Savers Only</p>
              <p className="text-[11px]">KYC checked before funds move</p>
            </div>
          </div>
        </div>

        {/* Regulatory Disclaimer & Copyright */}
        <div className="space-y-5 border-t border-line pt-8 text-[12px] text-ink-muted">
          <p className="leading-relaxed">
            Àjọ helps people run rotating savings circles (èsúsú / adashe / ajo) and personal saving
            plans in Nigeria and the United Kingdom. Payments are handled by our payment partners.
            Our terms and privacy notice are drafts while a lawyer reviews them.
          </p>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-line/60 pt-6 sm:flex-row text-[13px]">
            <p>© {new Date().getFullYear()} Àjọ. All rights reserved.</p>

            <div className="flex items-center gap-6">
              <Link href="/terms" className="hover:text-ink transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-ink transition-colors">
                Privacy
              </Link>
              <Link href="/help" className="hover:text-ink transition-colors">
                Help
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
