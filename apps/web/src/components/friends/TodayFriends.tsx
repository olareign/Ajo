"use client";

import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";

export type FriendsGlance = Readonly<{ friends: number; waiting: number }>;

/**
 * Today's glance at friends: how many, and whether anyone is waiting for an answer. Nothing at all
 * when friends cannot be had (for instance before the passport is approved).
 */
export function TodayFriends({ state }: Readonly<{ state: FriendsGlance | null | undefined }>) {
  if (!state) return null;
  return (
    <Link
      href="/friends"
      className="mt-4 flex items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
        <Users aria-hidden className="size-7" />
      </span>
      <span className="grid gap-0.5">
        <span className="text-[13px] font-semibold tracking-[0.01em] text-tertiary">Friends</span>
        <span className="text-[15px] font-semibold">
          {state.friends === 0
            ? "Find people you trust"
            : `${state.friends} ${state.friends === 1 ? "friend" : "friends"}`}
        </span>
        {state.waiting > 0 && (
          <span className="text-[14px] leading-5 font-medium text-oro-ink">
            {state.waiting} {state.waiting === 1 ? "request is" : "requests are"} waiting
          </span>
        )}
      </span>
      <ChevronRight aria-hidden className="ml-auto size-5 shrink-0 text-ink-muted" />
    </Link>
  );
}
