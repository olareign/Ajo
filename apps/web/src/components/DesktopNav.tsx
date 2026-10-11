"use client";

import {
  BarChart3,
  Bell,
  FileText,
  HelpCircle,
  House,
  LogOut,
  Orbit,
  PiggyBank,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/components/auth/post-json";
import { Spinner } from "@/components/ui/Spinner";
import { isAppRoute } from "@/lib/app-routes";
import { cn } from "@/lib/cn";

const GROUPS: readonly {
  label?: string;
  items: readonly { href: string; label: string; Icon: LucideIcon }[];
}[] = [
  {
    label: "Menu",
    items: [
      { href: "/today", label: "Home", Icon: House },
      { href: "/wallet", label: "Wallet", Icon: Wallet },
      { href: "/save", label: "Save", Icon: PiggyBank },
      { href: "/circles", label: "Circles", Icon: Orbit },
      { href: "/friends", label: "Friends", Icon: Users },
      { href: "/notifications", label: "Notifications", Icon: Bell },
    ],
  },
  {
    label: "Your money",
    items: [
      { href: "/wallet/statements", label: "Statements", Icon: FileText },
      { href: "/insights", label: "Insights", Icon: BarChart3 },
    ],
  },
  { label: "Account", items: [{ href: "/me", label: "Me", Icon: User }] },
];

const HELP = "/me/help";

/** The most specific section a path is in, so "/wallet/statements" lights Statements and not Wallet. */
function activeHref(path: string): string | undefined {
  // Help sits under Me but has its own link at the foot of the sidebar.
  if (path === HELP || path.startsWith(`${HELP}/`)) return HELP;
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
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  if (!isAppRoute(path)) return null;
  const active = activeHref(path);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface-raised lg:flex">
      <Link href="/today" className="flex items-center gap-2 px-6 pt-6 pb-5" aria-label="Àjọ home">
        <Image
          src="/brand/ajo-logo.webp"
          alt=""
          width={84}
          height={52}
          priority
          className="theme-light-only"
        />
        <Image
          src="/brand/ajo-logo-dark.webp"
          alt=""
          width={84}
          height={52}
          priority
          className="theme-dark-only"
        />
      </Link>
      <nav
        aria-label="Desktop"
        className="grid flex-1 content-start gap-6 overflow-y-auto px-4 pt-2 pb-6"
      >
        {GROUPS.map((group, i) => (
          <div key={group.label ?? i} className="grid gap-1">
            {group.label && (
              <p className="px-3 pb-1.5 text-[13px] font-semibold text-ink">{group.label}</p>
            )}
            {group.items.map(({ href, label, Icon }) => {
              const on = href === active;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3.5 rounded-m px-3 text-[15px] transition-colors",
                    on
                      ? "bg-primary-tint font-semibold text-primary"
                      : "font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  <Icon aria-hidden className="size-5" strokeWidth={on ? 2.25 : 1.75} />
                  {label}
                </Link>
              );
            })}
            {group.label === "Account" && (
              <button
                type="button"
                disabled={leaving}
                onClick={async () => {
                  setLeaving(true);
                  await postJson("/api/auth/sign-out", {});
                  // The server clears the cookie even if the API could not be reached.
                  router.replace("/sign-in");
                }}
                className="flex min-h-11 items-center gap-3.5 rounded-m px-3 text-left text-[15px] font-medium text-ink-muted transition-colors hover:bg-danger-tint hover:text-danger disabled:opacity-60"
              >
                {leaving ? (
                  <Spinner />
                ) : (
                  <LogOut aria-hidden className="size-5" strokeWidth={1.75} />
                )}
                {leaving ? "Signing out…" : "Sign out"}
              </button>
            )}
          </div>
        ))}
      </nav>
      {/* The help card at the foot, like a bank's: a person when the answers aren't enough. */}
      <div className="hero-card relative mx-4 mt-8 mb-6 grid justify-items-center gap-2 rounded-[22px] px-4 pt-9 pb-4 text-center shadow-lift">
        <span
          aria-hidden
          className="absolute -top-6 grid size-12 place-items-center rounded-full border-4 border-surface-raised bg-surface-raised text-primary shadow-lift"
        >
          <HelpCircle className="size-6" />
        </span>
        <p className="text-[15px] font-semibold">Help Center</p>
        <p className="text-[12px] leading-4 text-on-hero-muted">
          Stuck on something? Find an answer or write to a person.
        </p>
        <Link
          href={HELP}
          aria-current={active === HELP ? "page" : undefined}
          className="mt-2 flex min-h-10 w-full items-center justify-center rounded-m bg-surface-raised px-3 text-[13px] font-semibold text-ink hover:bg-surface-sunken"
        >
          Go to Help Center
        </Link>
      </div>
    </aside>
  );
}
