"use client";

import {
  BarChart3,
  Bell,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen,
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
import { setCompact, useCompactSidebar } from "@/lib/sidebar";

const GROUPS: readonly {
  label?: string;
  items: readonly { href: string; label: string; Icon: LucideIcon }[];
}[] = [
  {
    label: "Menu",
    items: [
      { href: "/today", label: "Overview", Icon: LayoutDashboard },
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

/** How wide the sidebar is, open and folded (`w-[248px]` / `w-20`); AppFrame leaves the same room. */

/** The most specific section a path is in, so "/wallet/statements" lights Statements and not Wallet. */
function activeHref(path: string): string | undefined {
  // Help sits under Me but has its own link at the foot of the sidebar.
  if (path === HELP || path.startsWith(`${HELP}/`)) return HELP;
  const all = GROUPS.flatMap((g) => g.items.map((i) => i.href));
  return all
    .filter((href) => path === href || path.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

const row = "flex min-h-10 items-center rounded-m text-[15px] transition-colors";

/**
 * The sidebar on a wide screen, inside the app. It takes the bottom bar's place (that one is for
 * phones) and adds what has room on a desk: statements and insights. It folds to icons (each keeps
 * its name for screen readers and as a tooltip), and the choice is remembered on this device.
 */
export function DesktopNav() {
  const path = usePathname() ?? "";
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const compact = useCompactSidebar();
  if (!isAppRoute(path)) return null;
  const active = activeHref(path);
  return (
    <aside
      data-compact={compact || undefined}
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col overflow-x-hidden overflow-y-auto border-r border-line bg-surface-raised transition-[width] duration-200 motion-reduce:transition-none lg:flex",
        compact ? "w-20" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "flex items-center pt-5 pb-3",
          compact ? "flex-col gap-3 px-3" : "justify-between gap-2 pr-3 pl-6",
        )}
      >
        <Link href="/today" aria-label="Àjọ home" className="shrink-0">
          <Image
            src="/brand/ajo-logo.webp"
            alt=""
            width={compact ? 52 : 84}
            height={compact ? 32 : 52}
            priority
            className="theme-light-only"
          />
          <Image
            src="/brand/ajo-logo-dark.webp"
            alt=""
            width={compact ? 52 : 84}
            height={compact ? 32 : 52}
            priority
            className="theme-dark-only"
          />
        </Link>
        <button
          type="button"
          onClick={() => setCompact(!compact)}
          aria-label={compact ? "Expand the menu" : "Collapse the menu"}
          aria-expanded={!compact}
          title={compact ? "Expand the menu" : "Collapse the menu"}
          className="grid size-10 place-items-center rounded-m text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          {compact ? (
            <PanelLeftOpen aria-hidden className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden className="size-5" />
          )}
        </button>
      </div>
      <nav
        aria-label="Desktop"
        className={cn("grid content-start gap-4 pt-2 pb-4", compact ? "px-3" : "px-4")}
      >
        {GROUPS.map((group, i) => (
          <div key={group.label ?? i} className="grid gap-1">
            {group.label &&
              (compact ? (
                <span aria-hidden className="mx-auto my-1 h-px w-8 bg-line" />
              ) : (
                <p className="px-3 pb-1.5 text-[13px] font-semibold text-ink">{group.label}</p>
              ))}
            {group.items.map(({ href, label, Icon }) => {
              const on = href === active;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  aria-label={compact ? label : undefined}
                  title={compact ? label : undefined}
                  className={cn(
                    row,
                    compact ? "justify-center px-0" : "gap-3.5 px-3",
                    on
                      ? "bg-primary-tint font-semibold text-primary"
                      : "font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  <Icon aria-hidden className="size-5 shrink-0" strokeWidth={on ? 2.25 : 1.75} />
                  {!compact && label}
                </Link>
              );
            })}
            {group.label === "Account" && (
              <button
                type="button"
                disabled={leaving}
                aria-label={compact ? "Sign out" : undefined}
                title={compact ? "Sign out" : undefined}
                onClick={async () => {
                  setLeaving(true);
                  await postJson("/api/auth/sign-out", {});
                  // The server clears the cookie even if the API could not be reached.
                  router.replace("/sign-in");
                }}
                className={cn(
                  row,
                  "text-left font-medium text-ink-muted hover:bg-danger-tint hover:text-danger disabled:opacity-60",
                  compact ? "justify-center px-0" : "gap-3.5 px-3",
                )}
              >
                {leaving ? (
                  <Spinner />
                ) : (
                  <LogOut aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                )}
                {!compact && (leaving ? "Signing out…" : "Sign out")}
              </button>
            )}
          </div>
        ))}
      </nav>
      {/* The help card at the foot, like a bank's: a person when the answers aren't enough. On a
          short screen the whole sidebar scrolls, so nothing above it is ever hidden. Folded, it
          becomes one help button. */}
      <div aria-hidden className="min-h-8 shrink-0" />
      {compact ? (
        <Link
          href={HELP}
          aria-current={active === HELP ? "page" : undefined}
          aria-label="Help Center"
          title="Help Center"
          className="mx-3 mt-auto mb-5 grid min-h-12 shrink-0 place-items-center rounded-m bg-primary-tint text-primary hover:brightness-95"
        >
          <HelpCircle aria-hidden className="size-6" />
        </Link>
      ) : (
        <div className="hero-card relative mx-4 mt-auto mb-5 grid shrink-0 justify-items-center gap-2 rounded-[22px] px-4 pt-8 pb-4 text-center shadow-lift">
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
      )}
    </aside>
  );
}
