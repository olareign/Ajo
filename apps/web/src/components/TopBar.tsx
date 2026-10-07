"use client";

import { Bell, Headset } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Me } from "@/components/onboarding/MeGate";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useUnread } from "@/lib/unread";
import { recall } from "@/lib/visit-cache";

const round =
  "relative grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink transition-colors hover:bg-line active:bg-line";

/**
 * The top of a tab screen, Opay style: your picture (a tap opens Me), what the screen is, then help
 * and the bell with its unread count. It stays put while the page scrolls.
 */
export function TopBar({
  title,
  eyebrow,
  unread,
  scrolled,
}: Readonly<{ title: string; eyebrow?: ReactNode; unread?: number | null; scrolled?: boolean }>) {
  // MeGate has already asked who this is before any tab screen draws, so this is only a read.
  const me = recall<Me>("me");
  const count = useUnread(unread);
  return (
    <div
      data-app-bar=""
      data-scrolled={scrolled || undefined}
      style={{ top: "var(--app-bar-top, 0px)" }}
      className="sticky z-20 -mx-4 -mt-6 flex h-16 items-center gap-3 bg-surface/95 px-4 backdrop-blur-md transition-shadow data-[scrolled]:shadow-[0_1px_0_var(--line)]"
    >
      <Link href="/me" aria-label="Me" className="shrink-0 rounded-full">
        <PersonPhoto
          username={me?.username}
          version={me?.photoVersion}
          name={me?.displayName ?? ""}
          size={40}
        />
      </Link>
      <div className="grid min-w-0 flex-1">
        {eyebrow && <div className="text-[12px] leading-4 text-ink-muted">{eyebrow}</div>}
        <h1 className="truncate font-display text-[19px] leading-6 font-bold tracking-[-0.01em] text-ink">
          {title}
        </h1>
      </div>
      <Link href="/help" aria-label="Support" className={round}>
        <Headset aria-hidden className="size-5" />
      </Link>
      <Link
        href="/notifications"
        aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
        className={round}
      >
        <Bell aria-hidden className="size-5" />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid min-w-[20px] place-items-center rounded-full border-2 border-surface bg-oro px-1 text-[11px] leading-4 font-bold text-on-oro"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    </div>
  );
}
