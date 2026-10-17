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
            {group.label === "Account" && (
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
            )}
          </div>
        ))}
      </nav>
      {/* The help card at the foot, like a bank's: a person when the answers aren't enough. On a
          short screen the whole sidebar scrolls, so nothing above it is ever hidden. Folded, it
          becomes one help button. */}
      <div aria-hidden className="min-h-8 shrink-0" />
      <Link
        href={HELP}
        aria-current={active === HELP ? "page" : undefined}
        aria-label="Help Center"
        title="Help Center"
        className="mx-3 mt-auto mb-5 hidden min-h-12 shrink-0 place-items-center rounded-m bg-primary-tint text-primary hover:brightness-95 rail:grid"
      >
        <HelpCircle aria-hidden className="size-6" />
      </Link>
      <div className="hero-card relative mx-4 mt-auto mb-5 grid shrink-0 justify-items-center gap-2 rounded-[22px] px-4 pt-8 pb-4 text-center shadow-lift rail:hidden">
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
