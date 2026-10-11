"use client";

import { Headset, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import type { Me } from "@/components/onboarding/MeGate";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { useTheme } from "@/lib/theme";
import { useUnread } from "@/lib/unread";
import { useRecall } from "@/lib/visit-cache";

const square =
  "relative grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface-raised text-ink shadow-lift transition-colors hover:bg-surface-sunken";

const DARK = "(prefers-color-scheme: dark)";
const deviceQuery = () =>
  typeof window.matchMedia === "function" ? window.matchMedia(DARK) : null;
function subscribeDevice(onChange: () => void): () => void {
  const query = deviceQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

/** Light or dark, one tap. It shows what you'll switch to; the same choice as Me → Appearance. */
function ThemeButton() {
  const [theme, setTheme] = useTheme();
  const deviceDark = useSyncExternalStore(
    subscribeDevice,
    () => deviceQuery()?.matches ?? false,
    () => null,
  );
  // The server can't know the device's theme: an empty square of the same size until it can.
  if (deviceDark === null) return <span aria-hidden className={square} />;
  const dark = theme === "dark" || (theme === "system" && deviceDark);
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={square}
    >
      {dark ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
    </button>
  );
}

/**
 * The top of every app screen on a desk: a welcome on the left; help, notifications and your
 * picture on the right. Hidden on a phone (it has its own top bar), and the unread count is only
 * asked for once the screen is known to be wide, so a phone never makes that request.
 */
export function DesktopHeader({ wide }: Readonly<{ wide: boolean }>) {
  const me = useRecall<Me>("me");
  const count = useUnread(undefined, wide);
  const first = me?.displayName?.split(/\s+/)[0];
  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-surface/90 backdrop-blur-md lg:block">
      <div className="flex h-[84px] w-full items-center gap-3 px-8">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="font-display text-[24px] leading-8 font-bold tracking-[-0.015em] text-ink">
            Welcome to <span className="text-primary">Àjọ.</span>
          </p>
          <p className="truncate text-[14px] text-ink-muted">
            {first ? `Hello ${first}, welcome back!` : "Welcome back!"}
          </p>
        </div>
        <ThemeButton />
        <Link href="/me/help" aria-label="Support" className={square}>
          <Headset aria-hidden className="size-5" />
        </Link>
        <NotificationBell count={count} className={square} />
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
