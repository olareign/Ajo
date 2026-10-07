"use client";

import {
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminContext } from "@/components/AdminProvider";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { get, post } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import type { Me, Permission } from "@/lib/types";
import { words } from "@/lib/format";

const NAV: readonly { href: string; label: string; Icon: LucideIcon; needs: Permission }[] = [
  { href: "/", label: "Overview", Icon: LayoutDashboard, needs: "overview:read" },
  { href: "/users", label: "People", Icon: Users, needs: "users:read" },
  { href: "/kyc", label: "Identity", Icon: ShieldCheck, needs: "kyc:read" },
  { href: "/cases", label: "Cases", Icon: ClipboardList, needs: "cases:read" },
  { href: "/audit", label: "Audit log", Icon: ScrollText, needs: "audit:read" },
  { href: "/team", label: "Team", Icon: UsersRound, needs: "team:manage" },
];

/**
 * The frame around every console page. It asks who is signed in before drawing anything, sends
 * anyone without a session to the sign-in page, and shows only the places their role can use.
 */
export function ConsoleShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const path = usePathname() ?? "/";
  const [me, setMe] = useState<Me | "failed">();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await get<Me>("me");
      if (!live) return;
      if (result.ok) return setMe(result.data);
      if (result.failure.signedOut) return router.replace("/login");
      setMe("failed");
    })();
    return () => {
      live = false;
    };
  }, [router]);

  async function signOut() {
    setLeaving(true);
    await post("auth/logout");
    router.replace("/login");
  }

  if (me === undefined) {
    return (
      <main className="grid min-h-dvh place-items-center text-ink-muted" role="status">
        <Spinner />
        <span className="sr-only">Loading…</span>
      </main>
    );
  }
  if (me === "failed") {
    return (
      <main className="mx-auto grid min-h-dvh max-w-md place-content-center gap-3 p-6 text-center">
        <p role="alert">We couldn&apos;t reach the server. Reload to try again.</p>
      </main>
    );
  }

  const items = NAV.filter((item) => me.permissions.includes(item.needs));
  return (
    <AdminContext.Provider value={me}>
      <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
        <aside className="border-b border-line bg-surface-raised md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:px-5 md:py-5">
            <div className="flex items-center gap-2">
              <FileSearch aria-hidden className="size-5 text-primary" />
              <span className="font-display text-[18px] font-bold">Àjọ Console</span>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={leaving}
              className="flex min-h-10 items-center gap-2 rounded-m px-3 text-[14px] font-semibold text-ink-muted hover:bg-surface-sunken disabled:opacity-50 md:hidden"
            >
              <LogOut aria-hidden className="size-[18px]" />
              {leaving ? "Signing out…" : "Sign out"}
            </button>
            <div className="md:mt-4 md:grid md:gap-1">
              <p className="hidden truncate text-[14px] font-semibold md:block">{me.name}</p>
              <p className="hidden truncate text-[12px] text-ink-muted md:block">{me.email}</p>
              <div className="md:mt-1">
                <Badge tone="info">{words(me.role)}</Badge>
              </div>
            </div>
          </div>
          <nav
            aria-label="Console"
            className="flex gap-1 overflow-x-auto px-3 pb-3 md:grid md:px-3 md:pb-0"
          >
            {items.map(({ href, label, Icon }) => {
              const active =
                href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 shrink-0 items-center gap-2 rounded-m px-3 text-[14px] font-semibold",
                    active
                      ? "bg-primary-tint text-primary"
                      : "text-ink-muted hover:bg-surface-sunken",
                  )}
                >
                  <Icon aria-hidden className="size-[18px]" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden px-3 pt-4 md:block">
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={leaving}
              className="flex min-h-10 w-full items-center gap-2 rounded-m px-3 text-[14px] font-semibold text-ink-muted hover:bg-surface-sunken disabled:opacity-50"
            >
              <LogOut aria-hidden className="size-[18px]" />
              {leaving ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
