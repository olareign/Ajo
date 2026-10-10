"use client";

import {
  BarChart3,
  FileText,
  Headset,
  House,
  MessageSquare,
  Orbit,
  PiggyBank,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAppRoute } from "@/lib/app-routes";
import { cn } from "@/lib/cn";

const GROUPS: readonly {
  label?: string;
  items: readonly { href: string; label: string; Icon: LucideIcon }[];
}[] = [
  {
    items: [
      { href: "/today", label: "Home", Icon: House },
      { href: "/wallet", label: "Wallet", Icon: Wallet },
      { href: "/save", label: "Save", Icon: PiggyBank },
      { href: "/circles", label: "Circles", Icon: Orbit },
      { href: "/friends", label: "Friends", Icon: Users },
      { href: "/notifications", label: "Messages", Icon: MessageSquare },
    ],
  },
  {
    label: "Your money",
    items: [
      { href: "/wallet/statements", label: "Statements", Icon: FileText },
      { href: "/insights", label: "Insights", Icon: BarChart3 },
    ],
  },
  { items: [{ href: "/me", label: "Me", Icon: User }] },
];

/** The most specific section a path is in, so "/wallet/statements" lights Statements and not Wallet. */
function activeHref(path: string): string | undefined {
  const all = GROUPS.flatMap((g) => g.items.map((i) => i.href));
  return all
    .filter((href) => path === href || path.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/**
 * The sidebar on a wide screen, inside the app. It takes the bottom bar's place (that one is for
 * phones) and adds what has room on a desk: statements and insights.
 */
export function DesktopNav() {
  const path = usePathname() ?? "";
  if (!isAppRoute(path)) return null;
  const active = activeHref(path);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface-raised lg:flex">
      <Link href="/today" className="flex items-center gap-2 px-6 pt-6 pb-5" aria-label="Àjọ home">
        <Image src="/brand/ajo-logo.webp" alt="" width={84} height={52} priority />
      </Link>
      <nav
        aria-label="Desktop"
        className="grid flex-1 content-start gap-5 overflow-y-auto px-3 pb-6"
      >
        {GROUPS.map((group, i) => (
          <div key={group.label ?? i} className="grid gap-1">
            {group.label && (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, Icon }) => {
              const on = href === active;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-m px-3 text-[15px] font-semibold transition-colors",
                    on
                      ? "bg-primary-tint text-primary"
                      : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  <Icon aria-hidden className="size-5" strokeWidth={on ? 2.25 : 1.75} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <Link
        href="/help"
        className="mx-3 mb-5 flex min-h-11 items-center gap-3 rounded-m px-3 text-[14px] font-semibold text-ink-muted hover:bg-surface-sunken"
      >
        <Headset aria-hidden className="size-5" />
        Help and support
      </Link>
    </aside>
  );
}
