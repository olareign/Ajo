"use client";

import {
  BellRing,
  ChevronRight,
  FileText,
  History,
  KeyRound,
  LifeBuoy,
  Lock,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  SquareAsterisk,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { postJson } from "@/components/auth/post-json";
import { InstallRow } from "@/components/install/InstallRow";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { PAGE } from "@/lib/page";
import { AppearancePicker } from "./AppearancePicker";

export function SettingsScreen() {
  return <MeGate needs="onboarded">{(me) => <Settings me={me} />}</MeGate>;
}

const TABS = [
  { id: "security", label: "Security", Icon: ShieldCheck },
  { id: "notifications", label: "Notifications", Icon: BellRing },
  { id: "appearance", label: "Appearance and app", Icon: Palette },
  { id: "help", label: "Help and legal", Icon: LifeBuoy },
] as const;
type Tab = (typeof TABS)[number]["id"];

const isTab = (value: string | null): value is Tab => TABS.some((t) => t.id === value);

/**
 * Everything about the account that isn't the profile: keeping it safe, how Àjọ reaches you, how
 * it looks, and help. One section at a time, chosen from a short list (a column on a tablet or a
 * desk, a row of chips on a phone); the choice is in the address, so it can be linked and shared.
 */
function Settings({ me }: Readonly<{ me: Me }>) {
  const asked = useSearchParams().get("tab");
  const tab: Tab = isTab(asked) ? asked : "security";
  return (
    <main className={PAGE}>
      <ScreenHeader
        title="Settings"
        subtitle="How your account is kept safe, and how Àjọ works for you."
        backHref="/me"
      />
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="flex gap-2 overflow-x-auto md:sticky md:top-28 md:grid md:gap-0.5 md:overflow-visible md:rounded-[20px] md:bg-surface-raised md:p-2 md:shadow-lift"
        >
          {TABS.map(({ id, label, Icon }) => {
            const on = id === tab;
            return (
              <Link
                key={id}
                href={`/settings?tab=${id}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-3 rounded-full px-4 text-[15px] whitespace-nowrap md:min-h-12 md:rounded-[14px] md:px-3.5",
                  on
                    ? "bg-primary-tint font-semibold text-primary"
                    : "bg-surface-raised font-medium text-ink-muted hover:text-ink md:bg-transparent md:hover:bg-surface-sunken",
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" strokeWidth={on ? 2.25 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="grid min-w-0 gap-5">
          {tab === "security" && <SecurityPanel me={me} />}
          {tab === "notifications" && <NotificationsPanel />}
          {tab === "appearance" && <AppearancePanel />}
          {tab === "help" && <HelpPanel />}
        </div>
      </div>
    </main>
  );
}

/** A group of settings in one card, with a title and, when it helps, one line under it. */
function Group({
  id,
  title,
  note,
  children,
}: Readonly<{ id: string; title: string; note?: string; children: ReactNode }>) {
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift"
    >
      <div className="px-5 pt-5 pb-3 md:px-7">
        <h2 id={id} className="font-display text-[20px] leading-7 font-bold">
          {title}
        </h2>
        {note && <p className="mt-1 text-[14px] text-ink-muted">{note}</p>}
      </div>
      <div className="divide-y divide-line border-t border-line">{children}</div>
    </section>
  );
}

/** One setting: what it is and what it does, with its action on the right. */
function Setting({
  Icon,
  title,
  body,
  href,
  action,
  status,
}: Readonly<{
  Icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  action: string;
  status?: ReactNode;
}>) {
  return (
    <Link href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-sunken md:px-7">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[13px] text-ink-muted">{body}</span>
      </span>
      {status}
      <span className="flex shrink-0 items-center gap-1 text-[14px] font-semibold text-primary">
        {action}
        <ChevronRight aria-hidden className="size-4" />
      </span>
    </Link>
  );
}

function SecurityPanel({ me }: Readonly<{ me: Me }>) {
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
    <>
      <Group
        id="signing-in"
        title="Signing in and moving money"
        note="Àjọ will never ask for your password, PIN or codes."
      >
        <Setting
          Icon={ShieldCheck}
          title="Authenticator app"
          body="A second lock: a 6-digit code from your phone, on top of your password."
          href="/me/security"
          action={me.mfaEnabled ? "Manage" : "Set up"}
          status={
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold",
                me.mfaEnabled ? "bg-leaf-tint text-leaf" : "bg-oro-tint text-oro-ink",
              )}
            >
              {me.mfaEnabled ? "On" : "Off"}
            </span>
          }
        />
        <Setting
          Icon={KeyRound}
          title="Password"
          body="Used to sign in on a new device."
          href="/me/password"
          action="Change"
        />
        <Setting
          Icon={SquareAsterisk}
          title="Transaction PIN"
          body="Asked for before money leaves your wallet."
          href="/me/pin"
          action={me.hasPin === false ? "Set" : "Change"}
        />
      </Group>

      <Group id="devices" title="Devices and activity">
        <Setting
          Icon={MonitorSmartphone}
          title="Devices and sign-ins"
          body="Where you're signed in. Sign out anything you don't recognise."
          href="/me/devices"
          action="Review"
        />
        <Setting
          Icon={History}
          title="Security activity"
          body="Sign-ins and changes to your account, newest first."
          href="/me/activity"
          action="See activity"
        />
      </Group>

      <section aria-label="Sign out" className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="quiet"
          size="lg"
          block
          loading={busy !== undefined}
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
          loading={busy !== undefined}
          disabled={busy !== undefined}
          onClick={() => setConfirming((open) => !open)}
        >
          Sign out of all devices
        </Button>
        {confirming && (
          <div
            ref={question}
            className="grid gap-4 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4 sm:col-span-2"
          >
            <p className="text-[15px] leading-[22px] text-ink">
              This signs you out everywhere, including this device. Use it if you lost a device or
              think someone else got in. You&apos;ll sign in again with your password.
            </p>
            {error && (
              <p role="alert" className="text-[14px] font-medium text-danger">
                {error}
              </p>
            )}
            <div className="grid grid-cols-[auto_1fr] gap-3 sm:flex sm:justify-end">
              <Button
                variant="quiet"
                loading={busy !== undefined}
                disabled={busy !== undefined}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={busy !== undefined}
                disabled={busy !== undefined}
                onClick={() => void signOutEverywhere()}
              >
                {busy === "everywhere" ? "One moment…" : "Sign out everywhere"}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Deliberately quiet and last: findable when someone means it, never in the way. */}
      <p className="text-[13px] text-ink-muted">
        Leaving Àjọ?{" "}
        <Link href="/me/close" className="underline underline-offset-4 hover:text-ink">
          Close your account
        </Link>
      </p>
    </>
  );
}

function NotificationsPanel() {
  return (
    <Group
      id="reach"
      title="How Àjọ reaches you"
      note="Everything still shows in Notifications, whatever you choose here."
    >
      <Setting
        Icon={BellRing}
        title="Email and device alerts"
        body="Choose which reminders and results also reach you by email, or as alerts on this device."
        href="/me/notifications"
        action="Choose"
      />
      <Setting
        Icon={History}
        title="All your notifications"
        body="Every message Àjọ has sent you, newest first."
        href="/notifications"
        action="Open"
      />
    </Group>
  );
}

function AppearancePanel() {
  return (
    <>
      <Group id="look" title="Light or dark">
        <AppearancePicker />
      </Group>
      <InstallRow />
    </>
  );
}

function HelpPanel() {
  return (
    <>
      <Group id="help-legal" title="Help and legal">
        <Setting
          Icon={LifeBuoy}
          title="Help and support"
          body="Quick answers, and a person when you need one."
          href="/me/help"
          action="Open"
        />
        <Setting
          Icon={FileText}
          title="Terms of use"
          body="The agreement between you and Àjọ."
          href="/terms"
          action="Read"
        />
        <Setting
          Icon={Lock}
          title="Privacy notice"
          body="What we keep about you, and why."
          href="/privacy"
          action="Read"
        />
      </Group>
      <p className="text-[12px] text-ink-muted">
        Àjọ · build {process.env.NEXT_PUBLIC_APP_BUILD ?? "local"}
      </p>
    </>
  );
}
