"use client";

import { Bell, BookUser, ChevronRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { InstallCard } from "@/components/install/InstallCard";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { Avatar } from "@/components/ui/Avatar";
import { TodayFriends } from "@/components/friends/TodayFriends";
import { TodayCircles } from "@/components/circles/TodayCircles";
import { TodaySavings } from "@/components/savings/TodaySavings";
import { WalletSummary } from "@/components/wallet/WalletSummary";

export function TodayScreen() {
  return <MeGate needs="onboarded">{(me) => <Today me={me} />}</MeGate>;
}

function Today({ me }: Readonly<{ me: Me }>) {
  // Today asks the server for one thing after another (the session's refresh token is single-use):
  // the wallet first, then the savings and the unread count, then friends, then circles.
  const [walletDone, setWalletDone] = useState(false);
  const [savingsDone, setSavingsDone] = useState(false);
  const [friendsDone, setFriendsDone] = useState(false);
  const [unread, setUnread] = useState(0);
  const onWallet = useCallback(() => setWalletDone(true), []);
  const onFriends = useCallback(() => setFriendsDone(true), []);
  const onSavings = useCallback(() => setSavingsDone(true), []);
  const onUnread = useCallback((n: number) => setUnread(n), []);
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-10 pb-28">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-[32px] leading-9 font-bold tracking-[-0.015em]">
          Hello, {me.displayName}
        </h1>
        <div className="-mt-1 flex shrink-0 items-center gap-1">
          <Link
            href="/notifications"
            aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
            className="relative grid size-11 place-items-center rounded-full text-ink"
          >
            <Bell aria-hidden className="size-6" />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 grid min-w-[18px] place-items-center rounded-full bg-oro px-1 text-[11px] leading-[18px] font-bold text-on-oro"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href="/me" aria-label="Me" className="grid size-11 place-items-center rounded-full">
            <Avatar size={40} />
          </Link>
        </div>
      </div>
      <p className="mt-3 text-ink-muted">Nothing needs you yet. Your circles will show up here.</p>
      <WalletSummary onLoaded={onWallet} />
      <TodaySavings go={walletDone} onUnread={onUnread} onDone={onSavings} />
      <TodayFriends go={savingsDone} onDone={onFriends} />
      <TodayCircles go={friendsDone} />
      {me.kycStatus !== undefined && me.kycStatus !== "approved" && (
        <Link
          href="/verify"
          className="mt-4 flex items-center gap-4 rounded-[var(--radius-l)] bg-primary-deep p-4 text-on-primary"
        >
          <BookUser aria-hidden className="size-7 shrink-0 text-oro" />
          <span className="grid gap-0.5">
            <span className="text-[15px] font-semibold">Get your passport stamped</span>
            <span className="text-[14px] leading-5 text-on-primary/85">
              {me.kycStatus === "rejected"
                ? "A stamp needs another try."
                : me.kycStatus === "pending"
                  ? "We're checking your details."
                  : "Five short steps open saving, circles and friends."}
            </span>
          </span>
          <ChevronRight aria-hidden className="ml-auto size-5 shrink-0" />
        </Link>
      )}
      {me.mfaEnabled === false && (
        <Link
          href="/me/security"
          className="mt-4 flex items-center gap-4 rounded-[var(--radius-l)] bg-oro-tint p-4 text-oro-ink"
        >
          <ShieldAlert aria-hidden className="size-6 shrink-0" />
          <span className="grid gap-0.5">
            <span className="text-[15px] font-semibold">Add a second lock</span>
            <span className="text-[14px] leading-5">
              Needed before you can move money. It takes a minute.
            </span>
          </span>
          <ChevronRight aria-hidden className="ml-auto size-5 shrink-0" />
        </Link>
      )}
      <InstallCard />
    </main>
  );
}
