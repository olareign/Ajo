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
  SlidersHorizontal,
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
];

/** At the foot of the sidebar: your profile, everything else about the account, and leaving. */
const ACCOUNT = [
  { href: "/me", label: "Me", Icon: User },
  { href: "/settings", label: "Settings", Icon: SlidersHorizontal },
] as const;

const HELP = "/me/help";

/** Pages under /me that belong to Settings rather than the profile. */
const SETTINGS_PAGES = [
  "/me/security",
  "/me/password",
  "/me/pin",
  "/me/devices",
  "/me/activity",
  "/me/notifications",
  "/me/close",
];

const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** The most specific section a path is in, so "/wallet/statements" lights Statements and not Wallet. */
export function activeHref(path: string): string | undefined {
  // Help sits under Me but has its own link at the foot of the sidebar.
  if (under(path, HELP)) return HELP;
  if (SETTINGS_PAGES.some((p) => under(path, p))) return "/settings";
  const all = [...GROUPS.flatMap((g) => g.items.map((i) => i.href)), ...ACCOUNT.map((a) => a.href)];
  return all.filter((href) => under(path, href)).sort((a, b) => b.length - a.length)[0];
}

const row = "flex min-h-10 items-center rounded-m text-[15px] transition-colors";
// Open: an icon and its name. Folded (a tablet, or a desk by choice): the icon alone, centred,
// with the name kept for screen readers and as a tooltip.
const item = "gap-3.5 px-3 rail:justify-center rail:gap-0 rail:px-0";
const name = "rail:sr-only";

/**
 * The sidebar from a tablet up, inside the app. It takes the bottom bar's place (that one is for
 * phones) and adds what has room: statements and insights. A tablet shows it folded to icons; a
 * desk shows it open, and it folds there too if the person chooses (remembered on this device).
 * The folded look is CSS (the `rail` variant), so the first paint is already right on a tablet.
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
      className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-x-hidden overflow-y-auto border-r border-line bg-surface-raised transition-[width] duration-200 motion-reduce:transition-none md:flex rail:w-20"
    >
      <div className="flex items-center justify-between gap-2 pt-5 pr-3 pb-3 pl-6 rail:flex-col rail:justify-start rail:gap-3 rail:px-3">
        <Link href="/today" aria-label="Àjọ home" className="shrink-0">
          <Image
            src="/brand/ajo-logo.webp"
            alt=""
            width={84}
            height={52}
            priority
            className="theme-light-only h-auto w-[84px] rail:w-[52px]"
          />
          <Image
            src="/brand/ajo-logo-dark.webp"
            alt=""
            width={84}
            height={52}
            priority
            className="theme-dark-only h-auto w-[84px] rail:w-[52px]"
          />
        </Link>
        {/* Folding is a desk choice; a tablet is always folded. */}
        <button
          type="button"
          onClick={() => setCompact(!compact)}
          aria-label={compact ? "Expand the menu" : "Collapse the menu"}
          aria-expanded={!compact}
          title={compact ? "Expand the menu" : "Collapse the menu"}
          className="hidden size-10 place-items-center rounded-m text-ink-muted hover:bg-surface-sunken hover:text-ink lg:grid"
        >
          {compact ? (
            <PanelLeftOpen aria-hidden className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden className="size-5" />
          )}
        </button>
      </div>
      <nav aria-label="Desktop" className="grid content-start gap-4 px-4 pt-2 pb-4 rail:px-3">
        {GROUPS.map((group, i) => (
          <div key={group.label ?? i} className="grid gap-1">
            {group.label && (
              <>
                <span aria-hidden className="mx-auto my-1 hidden h-px w-8 bg-line rail:block" />
                <p className="px-3 pb-1.5 text-[13px] font-semibold text-ink rail:hidden">
                  {group.label}
                </p>
              </>
            )}
            {group.items.map(({ href, label, Icon }) => {
              const on = href === active;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  title={label}
                  className={cn(
                    row,
                    item,
                    on
                      ? "bg-primary-tint font-semibold text-primary"
                      : "font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink",
                  )}
                >
                  <Icon aria-hidden className="size-5 shrink-0" strokeWidth={on ? 2.25 : 1.75} />
                  <span className={name}>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {/* The foot, kept in view on a tall screen and scrolled to on a short one: help, then your
          profile, settings and signing out. Folded, help becomes one button. */}
      <div className="mt-auto grid shrink-0 gap-3 px-4 pt-6 pb-5 rail:px-3">
        <Link
          href={HELP}
          aria-current={active === HELP ? "page" : undefined}
          title="Help Center"
          className="hero-card flex min-h-14 items-center gap-3 rounded-[16px] p-3 shadow-lift hover:brightness-110 rail:justify-center rail:p-0"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-raised text-primary">
            <HelpCircle aria-hidden className="size-5" />
          </span>
          <span className="grid rail:sr-only">
            <span className="text-[14px] font-semibold">Help Center</span>
            <span className="text-[12px] leading-4 text-on-hero-muted">
              Answers, or write to a person
            </span>
          </span>
        </Link>
        <div role="group" aria-label="Account" className="grid gap-1 border-t border-line pt-3">
          {ACCOUNT.map(({ href, label, Icon }) => {
            const on = href === active;
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                title={label}
                className={cn(
                  row,
                  item,
                  on
                    ? "bg-primary-tint font-semibold text-primary"
                    : "font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink",
                )}
              >
                <Icon aria-hidden className="size-5 shrink-0" strokeWidth={on ? 2.25 : 1.75} />
                <span className={name}>{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            disabled={leaving}
            title="Sign out"
            onClick={async () => {
              setLeaving(true);
              await postJson("/api/auth/sign-out", {});
              // The server clears the cookie even if the API could not be reached.
              router.replace("/sign-in");
            }}
            className={cn(
              row,
              item,
              "text-left font-medium text-ink-muted hover:bg-danger-tint hover:text-danger disabled:opacity-60",
            )}
          >
            {leaving ? (
              <Spinner />
            ) : (
              <LogOut aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
            )}
            <span className={name}>{leaving ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
