"use client";

import { Bell, Headset } from "lucide-react";
import Link from "next/link";
import type { Me } from "@/components/onboarding/MeGate";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useUnread } from "@/lib/unread";
import { useRecall } from "@/lib/visit-cache";

const square =
  "relative grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface-raised text-ink shadow-lift transition-colors hover:bg-surface-sunken";

/**
 * The top of every app screen on a desk: a welcome on the left; help, notifications and your
 * picture on the right. Hidden on a phone (it has its own top bar), and the unread count is only
 * asked for once the screen is known to be wide, so a phone never makes that request.
 */
export function DesktopHeader({ wide }: Readonly<{ wide: boolean }>) {
  const me = useRecall<Me>("me");
  const count = useUnread(wide ? undefined : 0);
  const first = me?.displayName?.split(/\s+/)[0];
  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-surface/90 backdrop-blur-md lg:block">
      <div className="mx-auto flex h-[84px] w-full max-w-6xl items-center gap-3 px-4">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="font-display text-[24px] leading-8 font-bold tracking-[-0.015em] text-ink">
            Welcome to <span className="text-primary">Àjọ.</span>
          </p>
          <p className="truncate text-[14px] text-ink-muted">
            {first ? `Hello ${first}, welcome back!` : "Welcome back!"}
          </p>
        </div>
        <Link href="/me/help" aria-label="Support" className={square}>
          <Headset aria-hidden className="size-5" />
        </Link>
        <Link
          href="/notifications"
          aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
          className={square}
        >
          <Bell aria-hidden className="size-5" />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 grid min-w-[20px] place-items-center rounded-full border-2 border-surface bg-oro px-1 text-[11px] leading-4 font-bold text-on-oro"
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Link>
        <Link href="/me" aria-label="Me" className="ml-1 shrink-0 rounded-full">
          <PersonPhoto
            username={me?.username}
            version={me?.photoVersion}
            name={me?.displayName ?? ""}
            size={44}
          />
        </Link>
      </div>
    </header>
  );
}
