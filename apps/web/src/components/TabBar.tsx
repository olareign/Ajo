"use client";

import { House, Orbit, PiggyBank, Plus, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const LEFT = [
  { href: "/today", label: "Home", Icon: House },
  { href: "/save", label: "Save", Icon: PiggyBank },
] as const;
const RIGHT = [
  { href: "/circles", label: "Circles", Icon: Orbit },
  { href: "/me", label: "Me", Icon: User },
] as const;

type Props = Readonly<{ current: string; onAction?: () => void; actionOpen?: boolean }>;

/** Bottom navigation: four destinations and the gold action (add money, save, start a circle). */
export function TabBar({ current, onAction, actionOpen = false }: Props) {
  const tab = ({ href, label, Icon }: (typeof LEFT)[number] | (typeof RIGHT)[number]) => {
    const active = current === href || current.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "grid min-h-12 justify-items-center gap-1 rounded-m pt-1 text-[11px] font-semibold leading-[14px] transition-colors",
          active ? "text-primary" : "text-ink-muted hover:text-ink",
        )}
      >
        <span
          className={cn(
            "grid h-7 w-12 place-items-center rounded-full transition-colors",
            active && "bg-primary-tint",
          )}
        >
          <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
        </span>
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-md grid-cols-[1fr_1fr_auto_1fr_1fr] items-end gap-1 px-3 pt-2 pb-2">
        {LEFT.map(tab)}
        <button
          type="button"
          aria-label="Quick actions: add money, save or start a circle"
          aria-haspopup="dialog"
          aria-expanded={actionOpen}
          onClick={onAction}
          className="-mt-7 grid size-14 place-items-center rounded-full border-4 border-surface bg-oro text-on-oro shadow-lift transition-transform active:scale-95"
        >
          <Plus
            aria-hidden
            className={cn("size-[26px] transition-transform", actionOpen && "rotate-45")}
            strokeWidth={2.25}
          />
        </button>
        {RIGHT.map(tab)}
      </div>
    </nav>
  );
}
