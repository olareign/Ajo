"use client";

import { BadgeCheck, BookUser, ChevronRight, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { postJson } from "@/components/auth/post-json";
import { InstallRow } from "@/components/install/InstallRow";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export function MeScreen() {
  return <MeGate needs="onboarded">{(me) => <Account me={me} />}</MeGate>;
}

/** The member card: who you are in Àjọ, stitched round like everything the app sews together. */
function MemberCard({ me }: Readonly<{ me: Me }>) {
  return (
    <section
      aria-label="Your membership"
      className="relative grid grid-cols-1 gap-5 rounded-[var(--radius-l)] bg-primary-tint p-6"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-2 rounded-[calc(var(--radius-l)-8px)] border-[1.5px] border-dashed border-primary/35"
      />
      <div className="flex items-center gap-4">
        <Avatar size={64} />
        <div className="grid min-w-0 gap-0.5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-tertiary">ÀJỌ MEMBER</p>
          {me.username && (
            <p className="truncate font-display text-[26px] leading-8 font-bold text-primary-deep">
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

/** What the identity row says. An approval given without the checks never reads as a plain "Approved". */
function identityWord(me: Me): string {
  if (me.kycVia === "hold") return "On hold";
  if (me.kycVia === "waived" && me.kycStatus === "approved") return "Approved for now";
  return IDENTITY_WORDS[me.kycStatus ?? "not_started"];
}

function Account({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"here" | "everywhere">();
  const [error, setError] = useState<string>();
  const question = useRef<HTMLDivElement>(null);

  // On a phone the question opens below the screen: bring it into view so the tap visibly does something.
  useEffect(() => {
    if (confirming) question.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [confirming]);

  async function signOut() {
    setBusy("here");
    await postJson("/api/auth/sign-out", {});
    // The server clears the cookie even if the API could not be reached.
    router.replace("/sign-in");
  }

  async function signOutEverywhere() {
    setError(undefined);
    setBusy("everywhere");
    const result = await postJson("/api/auth/sign-out-all", {});
    if (result.ok || result.status === 401) return router.replace("/sign-in");
    setBusy(undefined);
    setError(
      "We couldn't sign you out of your other devices. You're still signed in here; please try again.",
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-10 pb-28">
      <ScreenHeader
        title="Me"
        subtitle="Your account, and how it is kept safe."
        backHref="/today"
      />
      <div className="grid grid-cols-1 gap-8">
        <MemberCard me={me} />

        <InstallRow />

        <section aria-labelledby="security" className="grid grid-cols-1 gap-3">
          <h2 id="security" className="font-display text-[22px] leading-7 font-semibold">
            Security
          </h2>
          <Link
            href="/verify"
            className="flex items-center justify-between gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
          >
            <p className="flex items-center gap-3 text-[15px] font-semibold">
              <BookUser aria-hidden className="size-5 text-primary" />
              Identity
            </p>
            <p className="flex items-center gap-1 text-[14px] font-medium text-ink-muted">
              {identityWord(me)}
              <ChevronRight aria-hidden className="size-5" />
            </p>
          </Link>
          <Link
            href="/me/security"
            className="flex items-center justify-between gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
          >
            <p className="flex items-center gap-3 text-[15px] font-semibold">
              <ShieldCheck aria-hidden className="size-5 text-primary" />
              Authenticator app
            </p>
            <p className="flex items-center gap-1 text-[14px] font-medium text-ink-muted">
              {me.mfaEnabled ? "On" : "Set up"}
              <ChevronRight aria-hidden className="size-5" />
            </p>
          </Link>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <Button
              variant="quiet"
              size="lg"
              block
              disabled={busy !== undefined}
              onClick={() => void signOut()}
            >
              {busy === "here" ? "One moment…" : "Sign out"}
            </Button>
            <Button
              variant="danger"
              size="lg"
              block
              aria-expanded={confirming}
              disabled={busy !== undefined}
              onClick={() => setConfirming((open) => !open)}
            >
              Sign out of all devices
            </Button>
            {confirming && (
              <div
                ref={question}
                className="grid grid-cols-1 gap-4 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4"
              >
                <p className="text-[15px] leading-[22px] text-ink">
                  This signs you out everywhere, including this phone. Use it if you lost a device
                  or think someone else got in. You&apos;ll sign in again with your password.
                </p>
                {error && (
                  <p role="alert" className="text-[14px] font-medium text-danger">
                    {error}
                  </p>
                )}
                <div className="grid grid-cols-[auto_1fr] gap-3">
                  <Button
                    variant="quiet"
                    disabled={busy !== undefined}
                    onClick={() => setConfirming(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy !== undefined}
                    onClick={() => void signOutEverywhere()}
                  >
                    {busy === "everywhere" ? "One moment…" : "Sign out everywhere"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
