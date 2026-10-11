"use client";

import { useEffect } from "react";
import { recall, remember, useRecall } from "./visit-cache";

/** How often the bell checks for new notifications while the page is in front of the person. */
export const UNREAD_POLL_MS = 60_000;
/** Sent on `window` when the unread count goes up after the first look: the bell rings. */
export const NEW_NOTIFICATIONS = "ajo-new-notifications";

let watchers = 0;
let timer: ReturnType<typeof setInterval> | undefined;

async function check(): Promise<void> {
  try {
    const res = await fetch("/api/notifications?limit=1", { credentials: "same-origin" });
    if (!res.ok) return;
    const body = (await res.json()) as { unread?: unknown };
    if (typeof body.unread !== "number") return;
    const before = recall<number>("unread");
    remember("unread", body.unread);
    if (before !== undefined && body.unread > before) {
      window.dispatchEvent(new CustomEvent(NEW_NOTIFICATIONS, { detail: body.unread - before }));
    }
  } catch {
    /* the bell keeps the last number it had */
  }
}

const whenVisible = () => {
  if (document.visibilityState === "visible") void check();
};

/**
 * One check for the whole page, however many bells are drawn: now (unless this visit already
 * knows, or the screen is about to supply the number), then every minute while the page is visible, and again when the person comes back to it.
 */
function watch(skipFirst: boolean): () => void {
  watchers += 1;
  if (watchers === 1) {
    if (!skipFirst && recall<number>("unread") === undefined) void check();
    timer = setInterval(whenVisible, UNREAD_POLL_MS);
    document.addEventListener("visibilitychange", whenVisible);
  }
  return () => {
    watchers -= 1;
    if (watchers === 0) {
      clearInterval(timer);
      timer = undefined;
      document.removeEventListener("visibilitychange", whenVisible);
    }
  };
}

/**
 * How many notifications are unread, for the bell, kept up to date while the page is open. A
 * screen that already has the number can pass it in (it becomes the shared value). `watching`
 * false draws the bell without checking (the desk header on a phone, where it is hidden).
 */
export function useUnread(known?: number | null, watching = true): number {
  const shared = useRecall<number>("unread");
  useEffect(() => {
    if (typeof known === "number") remember("unread", known);
  }, [known]);
  // A screen that passes the count (even null, "coming with my data") is about to supply it.
  const supplies = known !== undefined;
  useEffect(() => (watching ? watch(supplies) : undefined), [watching, supplies]);
  return shared ?? (typeof known === "number" ? known : 0);
}
