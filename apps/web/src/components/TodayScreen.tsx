"use client";

import { ChevronRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { MeGate } from "@/components/onboarding/MeGate";
import { Avatar } from "@/components/ui/Avatar";
import { WalletSummary } from "@/components/wallet/WalletSummary";

export function TodayScreen() {
  return (
    <MeGate needs="onboarded">
      {(me) => (
        <main className="mx-auto w-full max-w-md px-4 pt-10 pb-28">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-[32px] leading-9 font-bold tracking-[-0.015em]">
              Hello, {me.displayName}
            </h1>
            <Link
              href="/me"
              aria-label="Me"
              className="-mt-1 grid size-11 shrink-0 place-items-center rounded-full"
            >
              <Avatar size={40} />
            </Link>
          </div>
          <p className="mt-3 text-ink-muted">
            Nothing needs you yet. Your circles will show up here.
          </p>
          <WalletSummary />
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
        </main>
      )}
    </MeGate>
  );
}
