"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  HelpCircle,
  Lock,
  Mail,
  Orbit,
  PiggyBank,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { supportMailto } from "@/lib/support";
import { cn } from "@/lib/cn";
import {
  AmbientGlows,
  DotGridBackground,
  OrbitalRingsBackground,
} from "@/components/landing/BackgroundDecorations";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

type Category = "all" | "circles" | "security" | "currency" | "account";

interface HelpTopic {
  id: string;
  category: Category;
  q: string;
  a: string;
  highlight?: string;
}

const TOPICS: HelpTopic[] = [
  {
    id: "how-circles-work",
    category: "circles",
    q: "How does an Èsúsú circle work on Àjọ?",
    a: "An Èsúsú circle brings together a trusted group (3 to 30 people) who contribute a set share on a fixed cycle (weekly, every two weeks, or monthly). In every cycle, the combined pot is paid out to one member in turn until everyone has collected their payout.",
    highlight: "Zero management drama with automated bank mandates.",
  },
  {
    id: "missed-turn",
    category: "security",
    q: "What happens if someone misses their contribution payment?",
    a: "Members still building a record lock a security deposit when they join. If a payment is still missing after two days of retries, their deposit pays their share so the round goes ahead, and they can't join a new circle for 90 days. Members with a good record have no deposit, so if one of them misses, that round pays what came in and our team chases the rest.",
    highlight: "Deposits cover a missed share.",
  },
  {
    id: "deposit-return",
    category: "security",
    q: "When and how do I get my security deposit back?",
    a: "Once all rotation rounds are complete and your circle finishes with all contributions fulfilled, your locked deposit is returned to your available wallet balance. You can withdraw it to your bank or roll it into your next circle.",
    highlight: "Fully refunded upon circle completion.",
  },
  {
    id: "multi-currency",
    category: "currency",
    q: "Can members participate from the UK and Nigeria in different currencies?",
    a: "Yes. Àjọ works in Nigerian Naira (₦) and British Pounds (£), and each wallet is in its owner's own currency. In the UK you add money by card; in Nigeria by card, bank transfer or USSD, with bank auto-debit. Withdrawals to UK banks aren't switched on yet.",
    highlight: "Your wallet stays in your own currency.",
  },
  {
    id: "lost-phone",
    category: "security",
    q: "I lost my phone or think someone accessed my account",
    a: "Sign in immediately on another device, go to Settings, tap 'Sign out of all devices', and change your password. Security activity in Settings lists every sign-in and change. If you need more help, email us.",
    highlight: "One-tap session revocation from any browser.",
  },
  {
    id: "forgot-pin",
    category: "account",
    q: "I forgot my transaction PIN. How do I reset it?",
    a: "Go to Settings, then Transaction PIN, and select Reset. For your security, you will need your account password, and the code from your authenticator app if it's on.",
    highlight: "PIN reset protected by your password.",
  },
  {
    id: "raise-limits",
    category: "account",
    q: "How do I raise my deposit and transaction limits?",
    a: "Your limits scale automatically as you verify your profile. Tier 1 gives access to standard circles. To raise limits for higher-value circles, go to Me and tap 'Raise your level' to submit identity verification (BVN/NIN for Nigeria, or government ID for UK/diaspora).",
    highlight: "Limits rise as you verify.",
  },
  {
    id: "missing-payment",
    category: "account",
    q: "A payment is missing or looks incorrect on my ledger",
    a: "Check your Wallet transaction history and real-time ledger status first. If an issue persists, email our support team with the transaction date and amount. Remember: never share your password, PIN or OTP codes.",
    highlight: "Every payment has a reference you can quote.",
  },
  {
    id: "solo-pots",
    category: "circles",
    q: "What are Solo Target Pots and how do they differ from circles?",
    a: "Solo Target Pots are personal savings vaults designed for individual goals like house rent, school fees, or vacation savings. You set your own target amount and scheduled auto-debits without waiting on or coordinating with other circle members.",
    highlight: "Independent savings vaults with custom lock durations.",
  },
  {
    id: "close-account",
    category: "account",
    q: "How do I close my Àjọ account?",
    a: "Ensure your available wallet balance is withdrawn, any active circles have finished their full cycle, and any solo pots are completed. Then go to Settings, tap 'Close your account', and confirm with your password (and your authenticator code, if it's on).",
    highlight: "No fee to close your account.",
  },
];

const CATEGORIES: {
  id: Category;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "All Questions", icon: HelpCircle },
  { id: "circles", label: "Èsúsú Circles", icon: Orbit },
  { id: "security", label: "Security & Deposits", icon: ShieldCheck },
  { id: "currency", label: "Multi-Currency (£/₦)", icon: Wallet },
  { id: "account", label: "Account & Limits", icon: PiggyBank },
];

const band = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10";

/** `supportEmail` is the address staff set in the admin console, read on the server. */
export function PublicHelpCenter({ supportEmail }: Readonly<{ supportEmail: string }>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "how-circles-work": true,
    "missed-turn": true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTopics = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return TOPICS.filter((topic) => {
      const matchesCategory = selectedCategory === "all" || topic.category === selectedCategory;
      const matchesQuery =
        !q ||
        topic.q.toLowerCase().includes(q) ||
        topic.a.toLowerCase().includes(q) ||
        (topic.highlight && topic.highlight.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="relative min-h-dvh bg-surface text-ink transition-colors duration-200 overflow-x-hidden">
      <DotGridBackground />
      <OrbitalRingsBackground />
      <AmbientGlows />

      <LandingHeader />

      <main className="relative z-10">
        {/* Help Center Hero */}
        <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 text-center">
          <div className={`${band} max-w-3xl space-y-6`}>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-tint/90 px-4 py-1.5 text-xs font-bold text-primary shadow-xs">
                <HelpCircle className="size-3.5" />
                <span>Knowledge Base & Support Desk</span>
              </span>
            </div>

            <h1 className="font-display text-[40px] leading-tight font-black tracking-tight sm:text-[52px] lg:text-[60px]">
              How can we <span className="text-primary">help you</span> today?
            </h1>

            <p className="mx-auto max-w-xl text-base sm:text-lg leading-relaxed text-ink-muted">
              Quick answers to your questions about Èsúsú rotations, security deposits, bank debits,
              and cross-border currency wallets.
            </p>

            {/* Interactive Search Bar */}
            <div className="relative mx-auto mt-6 max-w-xl">
              <Search
                aria-hidden="true"
                className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="text"
                placeholder="Search topics (e.g. deposit, PIN, missed turn, UK pounds)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search help topics"
                className="w-full rounded-2xl border border-line bg-surface-raised py-4 pl-12 pr-10 text-sm font-medium text-ink placeholder:text-ink-muted/70 shadow-lift focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div
              role="tablist"
              aria-label="Help topic categories"
              className="flex flex-wrap items-center justify-center gap-2 pt-3"
            >
              {CATEGORIES.map(({ id, label, icon: Icon }) => {
                const isActive = selectedCategory === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedCategory(id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all",
                      isActive
                        ? "bg-primary text-on-primary shadow-xs scale-102"
                        : "border border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Main Q&A Content & Direct Support Sidebar */}
        <section className="py-12 lg:py-16 border-t border-line bg-surface-sunken/40">
          <div className={`${band} grid gap-10 lg:grid-cols-12`}>
            {/* Left Column: Expandable Questions List (8 cols on lg) */}
            <div className="space-y-4 lg:col-span-8">
              <div className="flex items-center justify-between pb-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                  {selectedCategory === "all"
                    ? "Frequently Asked Questions"
                    : CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                </h2>
                <span className="text-xs font-semibold text-ink-muted">
                  Showing {filteredTopics.length}{" "}
                  {filteredTopics.length === 1 ? "answer" : "answers"}
                </span>
              </div>

              {filteredTopics.length === 0 ? (
                <div className="rounded-2xl border border-line bg-surface-raised p-10 text-center space-y-3">
                  <p className="font-display text-lg font-bold text-ink">
                    No matching questions found
                  </p>
                  <p className="text-sm text-ink-muted">
                    We couldn&apos;t find an answer matching &ldquo;{searchQuery}&rdquo;. Try
                    another term or send us an email directly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-2 inline-flex items-center rounded-m bg-primary-tint px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTopics.map((topic) => {
                    const isOpen = Boolean(openItems[topic.id]);
                    return (
                      <div
                        key={topic.id}
                        className={cn(
                          "rounded-2xl border transition-all duration-200 overflow-hidden",
                          isOpen
                            ? "border-primary/40 bg-surface-raised shadow-lift"
                            : "border-line bg-surface-raised/80 hover:border-line-strong hover:bg-surface-raised",
                        )}
                      >
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => toggleItem(topic.id)}
                          className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left transition-colors"
                        >
                          <span className="font-display text-base font-bold text-ink sm:text-lg">
                            {topic.q}
                          </span>
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted transition-transform duration-200",
                              isOpen && "rotate-180 bg-primary-tint text-primary",
                            )}
                          >
                            <ChevronDown className="size-4.5" />
                          </span>
                        </button>

                        {isOpen && (
                          <div className="border-t border-line/60 px-5 pb-5 pt-3 animate-fade-in space-y-3">
                            <p className="text-sm sm:text-base leading-relaxed text-ink-muted">
                              {topic.a}
                            </p>
                            {topic.highlight && (
                              <div className="flex items-center gap-2 pt-1 text-xs font-bold text-primary">
                                <Sparkles className="size-3.5 shrink-0" />
                                <span>{topic.highlight}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Direct Support Desk & Security Alerts (4 cols on lg) */}
            <div className="space-y-6 lg:col-span-4">
              {/* Email Support Card */}
              <div className="rounded-[24px] border border-line bg-surface-raised p-6 shadow-lift space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-tint text-primary font-bold">
                    <Mail className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">
                      Need personalized help?
                    </h3>
                    <p className="text-xs text-ink-muted">Direct desk with real humans</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-ink-muted">
                  Can&apos;t find what you&apos;re looking for? Email our support specialists with
                  your account email or transaction ID.
                </p>

                <a
                  href={supportMailto(supportEmail, "Àjọ help")}
                  className="flex items-center justify-between rounded-xl bg-primary px-4.5 py-3 text-xs sm:text-sm font-bold text-on-primary shadow-sm hover:bg-primary-deep transition-all"
                >
                  <span className="truncate">{supportEmail}</span>
                  <ArrowRight className="size-4 shrink-0 ml-2" />
                </a>

                <div className="flex items-center gap-2 text-[11px] text-ink-muted font-medium pt-1">
                  <span className="size-2 rounded-full bg-leaf animate-pulse" />
                  <span>A person reads every email</span>
                </div>
              </div>

              {/* Anti-Phishing Security Warning Banner */}
              <div className="rounded-[24px] border border-danger/40 bg-danger-tint p-5 space-y-3">
                <div className="flex items-center gap-2 text-danger font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="size-4" />
                  <span>Security & Anti-Fraud Notice</span>
                </div>
                <p className="text-xs leading-relaxed text-ink">
                  <strong>
                    Àjọ will NEVER ask for your password, transaction PIN, or 2FA authenticator
                    codes
                  </strong>{" "}
                  over the phone, email, WhatsApp, or social media. Anyone asking for these
                  credentials is not us.
                </p>
              </div>

              {/* Fine Print / Policy Documents */}
              <div className="rounded-[24px] border border-line bg-surface-raised p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Official Documents
                </h4>
                <div className="divide-y divide-line/70">
                  <Link
                    href="/terms"
                    className="flex items-center justify-between py-2.5 text-xs font-bold text-ink hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="size-3.5 text-ink-muted" />
                      Terms of Service
                    </span>
                    <ArrowRight className="size-3.5 text-ink-muted" />
                  </Link>
                  <Link
                    href="/privacy"
                    className="flex items-center justify-between py-2.5 text-xs font-bold text-ink hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="size-3.5 text-ink-muted" />
                      Privacy Notice
                    </span>
                    <ArrowRight className="size-3.5 text-ink-muted" />
                  </Link>
                  <Link
                    href="/safety"
                    className="flex items-center justify-between py-2.5 text-xs font-bold text-ink hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-ink-muted" />
                      Deposit Shield & Security
                    </span>
                    <ArrowRight className="size-3.5 text-ink-muted" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
