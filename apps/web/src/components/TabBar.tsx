"use client";

import { House, Orbit, PiggyBank, User, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/today", label: "Home", Icon: House },
  { href: "/save", label: "Save", Icon: PiggyBank },
  { href: "/circles", label: "Circles", Icon: Orbit },
  { href: "/wallet", label: "Wallet", Icon: Wallet },
  { href: "/me", label: "Me", Icon: User },
] as const;

/** Bottom navigation, Opay style: five equal destinations, the current one lit. */
export function TabBar({ current }: Readonly<{ current: string }>) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 pt-1.5 pb-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const active = current === href || current.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "grid min-h-14 content-center justify-items-center gap-0.5 rounded-m text-[11px] leading-[14px] font-semibold transition-colors",
                active ? "text-primary" : "text-ink-muted hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-14 place-items-center rounded-full transition-colors",
                  active && "bg-primary-tint",
                )}
              >
                <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
