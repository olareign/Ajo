"use client";

import {
  KeyRound,
  LogIn,
  LogOut,
  MonitorSmartphone,
  Phone,
  ShieldCheck,
  ShieldOff,
  TriangleAlert,
  UserX,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import {
  loadSecurityEvents,
  type SecurityEvent,
  type SecurityEventKind,
} from "@/lib/security-client";
import { whenText } from "@/lib/when";

export function ActivityScreen() {
  return <MeGate needs="onboarded">{() => <Activity />}</MeGate>;
}

const WORDS: Record<SecurityEventKind, { text: string; Icon: LucideIcon; tone: string }> = {
  signed_in: { text: "Signed in", Icon: LogIn, tone: "bg-primary-tint text-primary" },
  new_device: {
    text: "Signed in on a new device",
    Icon: MonitorSmartphone,
    tone: "bg-oro-tint text-oro-ink",
  },
  password_changed: { text: "Password changed", Icon: KeyRound, tone: "bg-oro-tint text-oro-ink" },
  password_reset: {
    text: "Password reset by email",
    Icon: KeyRound,
    tone: "bg-oro-tint text-oro-ink",
  },
  pin_changed: { text: "PIN changed", Icon: KeyRound, tone: "bg-oro-tint text-oro-ink" },
  pin_reset: { text: "PIN reset", Icon: KeyRound, tone: "bg-oro-tint text-oro-ink" },
  mfa_on: {
    text: "Authenticator app turned on",
    Icon: ShieldCheck,
    tone: "bg-leaf-tint text-leaf",
  },
  mfa_off: {
    text: "Authenticator app turned off",
    Icon: ShieldOff,
    tone: "bg-danger-tint text-danger",
  },
  recovery_codes_renewed: {
    text: "New recovery codes made",
    Icon: ShieldCheck,
    tone: "bg-leaf-tint text-leaf",
  },
  device_signed_out: {
    text: "A device was signed out",
    Icon: LogOut,
    tone: "bg-surface-sunken text-ink-muted",
  },
  signed_out_everywhere: {
    text: "Signed out of all devices",
    Icon: LogOut,
    tone: "bg-surface-sunken text-ink-muted",
  },
  device_forgotten: {
    text: "A remembered device was forgotten",
    Icon: LogOut,
    tone: "bg-surface-sunken text-ink-muted",
  },
  phone_changed: { text: "Phone number changed", Icon: Phone, tone: "bg-oro-tint text-oro-ink" },
  account_closed: { text: "Account closed", Icon: UserX, tone: "bg-danger-tint text-danger" },
};

/** What happened to the account lately, newest first, with a way out if something looks wrong. */
function Activity() {
  const router = useRouter();
  const [events, setEvents] = useState<readonly SecurityEvent[] | "failed">();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await loadSecurityEvents();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setEvents("failed");
      }
      setEvents(result.data);
    })();
    return () => {
      live = false;
    };
  }, [router, attempt]);

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title="Security activity"
        subtitle="Sign-ins and changes to your account, newest first."
        backHref="/me"
      />
      {events === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {events === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your activity. Check your connection and try again.
          </p>
          <Button onClick={() => (setEvents(undefined), setAttempt((n) => n + 1))}>
            Try again
          </Button>
        </div>
      )}
      {events !== undefined && events !== "failed" && (
        <div className="grid gap-4">
          <Link
            href="/me"
            className="flex items-center gap-3 rounded-[var(--radius-l)] border border-danger/30 bg-danger-tint p-4 text-[14px] leading-5 text-ink"
          >
            <TriangleAlert aria-hidden className="size-5 shrink-0 text-danger" />
            Something you don&apos;t recognise? Sign out of all devices from Me, then change your
            password.
          </Link>
          {events.length === 0 ? (
            <p className="text-[15px] text-ink-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
              {events.map((e, i) => {
                const { text, Icon, tone } = WORDS[e.kind] ?? WORDS.signed_in;
                return (
                  <li key={`${e.at}-${i}`} className="flex items-start gap-3 p-4">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}
                    >
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="grid min-w-0">
                      <span className="text-[15px] font-semibold">{text}</span>
                      <span className="text-[13px] text-ink-muted">
                        {whenText(e.at)}
                        {e.device ? ` · ${e.device}` : ""}
                        {e.ip ? ` · ${e.ip}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
