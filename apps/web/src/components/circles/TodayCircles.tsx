"use client";

import { ChevronRight, CircleDashed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadGroups, type GroupSummary } from "@/lib/groups-client";

/**
 * Today's glance at circles. It waits for its turn (`go`), and shows nothing if circles cannot be had
 * (for instance before the passport is approved).
 */
export function TodayCircles({ go }: Readonly<{ go: boolean }>) {
  const router = useRouter();
  const [groups, setGroups] = useState<readonly GroupSummary[]>();

  useEffect(() => {
    if (!go) return;
    let live = true;
    (async () => {
      const result = await loadGroups();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") router.replace("/sign-in");
        return;
      }
      setGroups(result.data);
    })();
    return () => {
      live = false;
    };
  }, [go, router]);

  if (!groups) return null;
  const going = groups.filter((g) => ["open", "picking", "running"].includes(g.status));
  const next = going.find((g) => g.status === "running") ?? going[0];
  return (
    <Link
      href="/circles"
      className="mt-4 flex items-center gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-oro-tint text-oro-ink">
        <CircleDashed aria-hidden className="size-7" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-[13px] font-semibold tracking-[0.01em] text-tertiary">Circles</span>
        {next ? (
          <>
            <span className="truncate text-[15px] font-semibold">{next.name}</span>
            <span className="text-[14px] leading-5 text-ink-muted">
              {next.status === "open"
                ? `${next.memberCount} of ${next.size} joined`
                : next.status === "picking"
                  ? "Pick your turn"
                  : next.mySpot
                    ? `Your turn is ${next.mySpot} of ${next.size}`
                    : "Under way"}
              {going.length > 1 ? ` · ${going.length} circles` : ""}
            </span>
          </>
        ) : (
          <>
            <span className="text-[15px] font-semibold">Save together</span>
            <span className="text-[14px] leading-5 text-ink-muted">
              Start a circle with people you trust.
            </span>
          </>
        )}
      </span>
      <ChevronRight aria-hidden className="ml-auto size-5 shrink-0 text-ink-muted" />
    </Link>
  );
}
