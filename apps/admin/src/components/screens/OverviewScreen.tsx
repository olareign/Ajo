"use client";

import {
  ClipboardList,
  ShieldCheck,
  UserX,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useAdmin, useCan } from "@/components/AdminProvider";
import { Failed, Loading, PageHeader } from "@/components/ui/Page";
import { get } from "@/lib/admin-client";
import type { Overview, Permission } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const CARDS: readonly {
  key: keyof Overview;
  label: string;
  Icon: LucideIcon;
  href: string;
  needs: Permission;
}[] = [
  { key: "users", label: "People", Icon: Users, href: "/users", needs: "users:read" },
  { key: "suspendedUsers", label: "Suspended", Icon: UserX, href: "/users", needs: "users:read" },
  {
    key: "pendingKyc",
    label: "Identity waiting",
    Icon: ShieldCheck,
    href: "/kyc",
    needs: "kyc:read",
  },
  {
    key: "openCases",
    label: "Open cases",
    Icon: ClipboardList,
    href: "/cases",
    needs: "cases:read",
  },
  { key: "admins", label: "Active staff", Icon: UsersRound, href: "/team", needs: "team:manage" },
];

export function OverviewScreen() {
  const me = useAdmin();
  const can = useCan();
  const { state, reload } = useLoad(() => get<Overview>("overview"));
  return (
    <>
      <PageHeader title={`Hello, ${me.name.split(" ")[0]}`} subtitle="Where things stand today." />
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.filter((c) => can(c.needs)).map(({ key, label, Icon, href }) => (
            <li key={key}>
              <Link
                href={href}
                className="flex items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift hover:bg-surface-sunken"
              >
                <span className="grid size-12 place-items-center rounded-full bg-primary-tint text-primary">
                  <Icon aria-hidden className="size-6" />
                </span>
                <span className="grid">
                  <span className="font-display text-[28px] leading-8 font-bold tabular-nums">
                    {state.data[key]}
                  </span>
                  <span className="text-[14px] text-ink-muted">{label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
