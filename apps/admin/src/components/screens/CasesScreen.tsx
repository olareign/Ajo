"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, statusTone } from "@/components/ui/Badge";
import {
  Card,
  Failed,
  Loading,
  PageHeader,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui/Page";
import { get } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import { money, when, words } from "@/lib/format";
import type { CaseSummary } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const TABS = ["open", "resolved", "written_off"] as const;

export function CasesScreen() {
  const [status, setStatus] = useState<(typeof TABS)[number]>("open");
  const { state, reload } = useLoad(() => get<CaseSummary[]>("cases", { status }), status);
  return (
    <>
      <PageHeader title="Cases" subtitle="Missed circle payments that need a person." />
      <div role="tablist" aria-label="Case status" className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={status === t}
            onClick={() => setStatus(t)}
            className={cn(
              "min-h-10 rounded-full px-4 text-[14px] font-semibold",
              status === t
                ? "bg-primary text-on-primary"
                : "bg-surface-sunken text-ink-muted hover:bg-line",
            )}
          >
            {words(t)}
          </button>
        ))}
      </div>
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <Card>
          {state.data.length === 0 ? (
            <p className="text-ink-muted">No {words(status).toLowerCase()} cases.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Member</th>
                    <th className={thClass}>Circle</th>
                    <th className={thClass}>Round</th>
                    <th className={thClass}>Still owed</th>
                    <th className={thClass}>Opened</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((c) => (
                    <tr key={c.id}>
                      <td className={tdClass}>
                        <Link href={`/cases/${c.id}`} className="font-semibold text-primary">
                          {c.member.name}
                        </Link>
                      </td>
                      <td className={tdClass}>{c.group.name}</td>
                      <td className={tdClass}>{c.round}</td>
                      <td className={cn(tdClass, "tabular-nums")}>
                        {money(c.stillOwed, c.currency)}
                      </td>
                      <td className={tdClass}>{when(c.openedAt)}</td>
                      <td className={tdClass}>
                        <Badge tone={statusTone(c.status)}>{words(c.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
