"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { isAppRoute } from "@/lib/app-routes";
import { cn } from "@/lib/cn";

/** Bump the value when what the notice says changes, so everyone sees the new one once. */
export const NOTICE_KEY = "ajo-privacy-notice";
export const NOTICE_VERSION = "2026-10-10";
const CHANGE = "ajo-privacy-notice-change";

// If storage is blocked (private windows), the answer still lasts for this visit.
let seenThisVisit = false;

function seen(): boolean {
  if (seenThisVisit) return true;
  try {
    return localStorage.getItem(NOTICE_KEY) === NOTICE_VERSION;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function dismiss(): void {
  try {
    localStorage.setItem(NOTICE_KEY, NOTICE_VERSION);
  } catch {
    // Blocked storage: remembered until the page closes.
    seenThisVisit = true;
  }
  window.dispatchEvent(new Event(CHANGE));
}

/**
 * Tells a first-time visitor, once, what Àjọ keeps on their device. Everything it uses is needed for
 * the app to work, so this is a notice, not a choice: there is nothing optional to accept or refuse.
 * It never blocks the page or covers the buttons a phone keeps at the bottom.
 */
export function PrivacyNotice() {
  const path = usePathname() ?? "";
  // The server can't see the device's storage, so it draws nothing; the page fills it in.
  const hidden = useSyncExternalStore(subscribe, seen, () => true);
  if (hidden) return null;

  return (
    <section
      aria-label="Cookies and your privacy"
      className={cn(
        "fixed inset-x-3 z-50 mx-auto max-w-md rounded-[20px] border border-line bg-surface-raised p-4 shadow-lift sm:inset-x-auto sm:left-6",
        // On a phone outside the app, the main buttons sit at the bottom (welcome, sign-in), so
        // the notice goes to the top; inside the app it sits just above the bottom bar.
        isAppRoute(path)
          ? "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] lg:bottom-6 lg:left-[272px]"
          : "top-[max(0.75rem,env(safe-area-inset-top))] sm:top-auto sm:bottom-6",
      )}
    >
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-oro-tint text-oro-ink">
          <Cookie aria-hidden className="size-5" />
        </span>
        <p className="text-[14px] leading-5 text-ink-muted">
          <span className="font-semibold text-ink">Only what Àjọ needs.</span> We use a few cookies
          to keep you signed in and safe. No ads, no tracking.
        </p>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Link
          href="/privacy#cookies"
          className="rounded-full px-3 py-2 text-[14px] font-semibold text-primary hover:bg-primary-tint"
        >
          Privacy notice
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary hover:bg-primary-deep"
        >
          Got it
        </button>
      </div>
    </section>
  );
}
