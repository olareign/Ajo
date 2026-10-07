"use client";

import { useEffect, useState } from "react";
import { recall, remember } from "./visit-cache";

/**
 * How many messages are unread, for the bell on every tab screen. Known at once if this visit has
 * asked already; otherwise one small request. Marking messages read forgets it (like every change).
 * A screen that already has the number (or is about to, null) can pass it in and skip the request.
 */
export function useUnread(known?: number | null): number {
  const [count, setCount] = useState(() => recall<number>("unread") ?? 0);
  const skip = known !== undefined;
  useEffect(() => {
    if (skip || recall<number>("unread") !== undefined) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/notifications?limit=1", { credentials: "same-origin" });
        if (!res.ok) return;
        const body = (await res.json()) as { unread?: unknown };
        if (typeof body.unread !== "number") return;
        remember("unread", body.unread);
        if (live) setCount(body.unread);
      } catch {
        /* the bell simply shows no number */
      }
    })();
    return () => {
      live = false;
    };
  }, [skip]);
  return known ?? count;
}
