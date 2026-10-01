"use client";

import { House, Orbit, Plus, User, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const LEFT = [
  { href: "/today", label: "Today", Icon: House },
  { href: "/circles", label: "Circles", Icon: Orbit },
] as const;
const RIGHT = [
  { href: "/wallet", label: "Wallet", Icon: Wallet },
  { href: "/me", label: "Me", Icon: User },
] as const;

type Props = Readonly<{ current: string; onAction?: () => void }>;

/** Bottom navigation: four destinations and the gold action (pay, add money, start a circle). */
export function TabBar({ current, onAction }: Props) {
  const tab = ({ href, label, Icon }: (typeof LEFT)[number] | (typeof RIGHT)[number]) => {
    const active = current === href || current.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "grid min-h-12 justify-items-center gap-0.5 rounded-m pt-1 text-[11px] font-semibold leading-[14px]",
          active ? "text-adire" : "text-ink-muted",
        )}
      >
        <Icon aria-hidden className="size-6" strokeWidth={1.75} />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-md grid-cols-[1fr_1fr_auto_1fr_1fr] items-end gap-1 px-3 pt-2 pb-2">
        {LEFT.map(tab)}
        <button
          type="button"
          aria-label="Pay, add money or start a circle"
          onClick={onAction}
          className="-mt-6 grid size-14 place-items-center rounded-full border-4 border-surface bg-oro text-on-oro shadow-lift"
        >
          <Plus aria-hidden className="size-[26px]" strokeWidth={2} />
        </button>
        {RIGHT.map(tab)}
      </div>
    </nav>
  );
}
