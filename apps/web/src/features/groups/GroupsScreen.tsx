"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { GroupCard, type GroupSummary } from "@/components/GroupCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { cn } from "@/lib/cn";

type Tab = "private" | "public";

const TABS: { id: Tab; label: string; empty: string }[] = [
  { id: "private", label: "Private Groups", empty: "You are not in any private group yet." },
  { id: "public", label: "Public Groups", empty: "No public groups to show yet." },
];

type Props = Readonly<{
  locale: string;
  privateGroups: readonly GroupSummary[];
  publicGroups: readonly GroupSummary[];
}>;

/** "Groups" screen from Figma: private/public tabs over a list of group cards. */
export function GroupsScreen({ locale, privateGroups, publicGroups }: Props) {
  const [tab, setTab] = useState<Tab>("private");
  const baseId = useId();
  const groups = tab === "private" ? privateGroups : publicGroups;
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-dvh px-6 pt-6 pb-28">
      <ScreenHeader title="Groups" backHref="/" />

      <div
        role="tablist"
        aria-label="Group type"
        className="mb-6 grid grid-cols-2 rounded-field bg-surface-muted p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-${t.id}-tab`}
            aria-selected={tab === t.id}
            aria-controls={`${baseId}-panel`}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-field py-3 text-sm transition-colors",
              tab === t.id ? "bg-brand-600 text-white" : "text-ink-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${tab}-tab`}>
        {groups.length === 0 ? (
          <div className="rounded-field bg-brand-50 p-6 text-center">
            <p className="mb-4 text-ink-muted">{active.empty}</p>
            <Link href="/groups/new" className="font-semibold text-brand-600 underline">
              Start a group
            </Link>
          </div>
        ) : (
          <ul className="space-y-6">
            {groups.map((g) => (
              <li key={g.id}>
                <GroupCard group={g} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav current="/groups" />
    </div>
  );
}
