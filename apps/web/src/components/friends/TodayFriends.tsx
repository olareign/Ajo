"use client";

import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadFriends, loadRequests } from "@/lib/friends-client";

/**
 * Today's glance at friends: how many, and whether anyone is waiting for an answer. It waits for its
 * turn (`go`), and shows nothing at all if it cannot be had (for instance before the passport is approved).
 */
export function TodayFriends({ go, onDone }: Readonly<{ go: boolean; onDone?: () => void }>) {
  const router = useRouter();
  const [state, setState] = useState<{ friends: number; waiting: number }>();

  useEffect(() => {
    if (!go) return;
    let live = true;
    (async () => {
      const friends = await loadFriends();
      if (!live) return;
      if (!friends.ok) {
        if (friends.failure.kind === "signed-out") router.replace("/sign-in");
        return onDone?.();
      }
      const requests = await loadRequests();
      if (!live) return;
      setState({
        friends: friends.data.length,
        waiting: requests.ok ? requests.data.incoming.length : 0,
      });
    })();
    return () => {
      live = false;
    };
  }, [go, router, onDone]);

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
