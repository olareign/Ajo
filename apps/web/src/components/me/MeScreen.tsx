"use client";

import { BadgeCheck, ChevronRight, Mail, SlidersHorizontal, UserPlus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { countryConfig } from "@/lib/kyc-config";
import { TierCard } from "./TierCard";
import { PAGE } from "@/lib/page";

export function MeScreen() {
  return <MeGate needs="onboarded">{(me) => <Account me={me} />}</MeGate>;
}

/** The member card: who you are in Àjọ, stitched round like everything the app sews together. */
function MemberCard({ me }: Readonly<{ me: Me }>) {
  return (
    <section
      aria-label="Your membership"
      className="relative grid grid-cols-1 gap-5 overflow-hidden rounded-[var(--radius-xl)] bg-primary-tint p-6"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-2 rounded-[calc(var(--radius-xl)-8px)] border-[1.5px] border-dashed border-primary/30"
      />
      <div className="flex items-center gap-4">
        <Link
          href="/me/photo"
          aria-label="Change your profile picture"
          className="shrink-0 rounded-full"
        >
          <PersonPhoto
            username={me.username}
            version={me.photoVersion}
            name={me.displayName}
            size={64}
          />
        </Link>
        <div className="grid min-w-0 gap-0.5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-tertiary">ÀJỌ MEMBER</p>
          {me.username && (
            <p className="truncate font-display text-[26px] leading-8 font-bold text-primary">
              @{me.username}
            </p>
          )}
          <p className="truncate text-[15px] text-ink">{me.displayName}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-dashed border-primary/30 pt-4">
        <p className="flex min-w-0 items-center gap-2 text-[14px] text-ink-muted">
          <Mail aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{me.email}</span>
        </p>
        {me.emailVerified && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-leaf-tint py-0.5 pr-2 pl-1.5 text-xs font-semibold text-leaf">
            <BadgeCheck aria-hidden className="size-3.5" strokeWidth={2} />
            Confirmed
          </span>
        )}
      </div>
    </section>
  );
}

const IDENTITY_WORDS = {
  not_started: "Not started",
  in_progress: "In progress",
  pending: "Being checked",
  approved: "Approved",
  rejected: "Needs another try",
} as const;

/** A detail about you, and its own way to change it when there is one. */
function Detail({
  label,
  children,
  action,
}: Readonly<{
  label: string;
  children: ReactNode;
  action?: Readonly<{ href: string; label: string }>;
}>) {
  return (
    <div className="grid content-start gap-1 border-t border-line px-5 py-4 md:px-7">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[16px] font-semibold">
        {children}
        {action && (
          <Link
            href={action.href}
            className="text-[14px] font-semibold text-primary hover:underline"
          >
            {action.label}
          </Link>
        )}
      </dd>
    </div>
  );
}

/** A way out of Me to somewhere related, as a card with one line of what it is. */
function Onward({
  href,
  Icon,
  title,
  body,
}: Readonly<{ href: string; Icon: typeof Mail; title: string; body: string }>) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-surface-raised p-5 shadow-lift hover:bg-surface-sunken md:px-7"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-tint text-primary">
        <Icon aria-hidden className="size-6" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-[16px] font-semibold">{title}</span>
        <span className="text-[14px] text-ink-muted">{body}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-muted" />
    </Link>
  );
}

/**
 * Me is the profile: who you are in Àjọ, your identity level, your details and how friends find
 * you. Everything else about the account (security, notifications, appearance, help) is Settings.
 */
function Account({ me }: Readonly<{ me: Me }>) {
  const country = countryConfig(me.country)?.name;
  return (
    <main className={PAGE}>
      <ScreenHeader
        tab
        title="Me"
        subtitle="Your profile, your identity, and how friends find you."
      />
      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch">
          <MemberCard me={me} />
          <TierCard me={me} />
        </div>

        <section
          aria-labelledby="details"
          className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift"
        >
          <h2
            id="details"
            className="px-5 pt-5 pb-3 font-display text-[20px] leading-7 font-bold md:px-7"
          >
            Personal details
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Full name">{me.displayName}</Detail>
            <Detail label="Username">{me.username ? `@${me.username}` : "Not chosen yet"}</Detail>
            <Detail label="Country">{country ?? "Not set"}</Detail>
            <Detail
              label="Identity check"
              action={{
                href: "/verify",
                label: me.kycStatus === "approved" ? "See it" : "Continue",
              }}
            >
              {IDENTITY_WORDS[me.kycStatus ?? "not_started"]}
            </Detail>
            <Detail label="Email">
              <span className="min-w-0 truncate">{me.email}</span>
              {me.emailVerified && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-leaf-tint py-0.5 pr-2 pl-1.5 text-xs font-semibold text-leaf">
                  <BadgeCheck aria-hidden className="size-3.5" strokeWidth={2} />
                  Confirmed
                </span>
              )}
            </Detail>
            <Detail
              label="Phone number"
              action={{ href: "/me/phone", label: me.phone ? "Change" : "Add a phone number" }}
            >
              {me.phone ? (
                <>
                  <span className="tabular-nums">{me.phone}</span>
                  <span className="text-[12px] font-medium text-oro-ink">Not verified</span>
                </>
              ) : null}
            </Detail>
            <Detail
              label="Profile picture"
              action={{
                href: "/me/photo",
                label: me.photoVersion != null ? "Change" : "Add a photo",
              }}
            >
              {me.photoVersion != null ? "Added" : null}
            </Detail>
          </dl>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Onward
            href="/friends/invite"
            Icon={UserPlus}
            title="Invite friends"
            body="Share your link or code with people you trust."
          />
          <Onward
            href="/settings"
            Icon={SlidersHorizontal}
            title="Settings"
            body="Security, notifications, appearance, help and legal."
          />
        </div>
      </div>
    </main>
  );
}
