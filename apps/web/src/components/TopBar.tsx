"use client";

import { Headset } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import type { Me } from "@/components/onboarding/MeGate";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useUnread } from "@/lib/unread";
import { useWide } from "@/lib/use-wide";
import { recall } from "@/lib/visit-cache";

const round =
  "relative grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink transition-colors hover:bg-line active:bg-line";

/**
 * The top of a tab screen, Opay style: your picture (a tap opens Me), what the screen is, then help
 * and the bell with its unread count. It stays put while the page scrolls.
 */
export function TopBar({
  title,
  deskTitle,
  eyebrow,
  unread,
  scrolled,
}: Readonly<{
  title: string;
  /** The title on a desk, where the header above already greets the person (Today: "Overview"). */
  deskTitle?: string;
  eyebrow?: ReactNode;
  unread?: number | null;
  scrolled?: boolean;
}>) {
  // MeGate has already asked who this is before any tab screen draws, so this is only a read.
  const me = recall<Me>("me");
  // From a tablet up this bell is hidden and the header's asks instead, so only one does.
  const count = useUnread(unread, !useWide());
  return (
    <div
      data-app-bar=""
      data-scrolled={scrolled || undefined}
      style={{ top: "var(--app-bar-top, 0px)" }}
      // On a desk the header above holds your picture, help and the bell, so this is just the title.
      className="sticky z-20 -mx-4 -mt-6 flex h-16 items-center gap-3 bg-surface/95 px-4 backdrop-blur-md transition-shadow data-[scrolled]:shadow-[0_1px_0_var(--line)] md:static md:mx-0 md:mt-0 md:h-auto md:bg-transparent md:px-0 md:backdrop-blur-none md:data-[scrolled]:shadow-none"
    >
      <Link href="/me" aria-label="Me" className="shrink-0 rounded-full md:hidden">
        <PersonPhoto
          username={me?.username}
          version={me?.photoVersion}
          name={me?.displayName ?? ""}
          size={40}
        />
      </Link>
      <div className="grid min-w-0 flex-1">
        {eyebrow && <div className="text-[12px] leading-4 text-ink-muted">{eyebrow}</div>}
        <h1 className="truncate font-display text-[19px] leading-6 font-bold tracking-[-0.01em] text-ink md:text-[28px] md:leading-9">
          {deskTitle ? (
            <>
              <span className="md:hidden">{title}</span>
              <span className="hidden md:inline">{deskTitle}</span>
            </>
          ) : (
            title
          )}
        </h1>
      </div>
      <Link href="/me/help" aria-label="Support" className={`${round} md:hidden`}>
        <Headset aria-hidden className="size-5" />
      </Link>
      <NotificationBell count={count} className={`${round} md:hidden`} />
    </div>
  );
}
