"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
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
import { when } from "@/lib/format";
import type { KycQueueRow } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export function KycQueueScreen() {
  const { state, reload } = useLoad(() => get<KycQueueRow[]>("kyc"));
  return (
    <>
      <PageHeader
        title="Identity"
        subtitle="People with a step waiting for a decision, oldest first."
      />
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <Card>
          {state.data.length === 0 ? (
            <p className="text-ink-muted">
              Nothing is waiting. (Identity checks aren&apos;t connected to a partner yet, so steps
              only arrive here once they are.)
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Person</th>
                    <th className={thClass}>Country</th>
                    <th className={thClass}>Waiting</th>
                    <th className={thClass}>Since</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((q) => (
                    <tr key={q.id}>
                      <td className={tdClass}>
                        <Link href={`/kyc/${q.id}`} className="font-semibold text-primary">
                          {q.displayName}
                        </Link>
                        <div className="text-[13px] text-ink-muted">{q.email}</div>
                      </td>
                      <td className={tdClass}>{q.country ?? "–"}</td>
                      <td className={tdClass}>
                        {q.waitingSteps} {q.waitingSteps === 1 ? "step" : "steps"}{" "}
                        {q.held && <Badge tone="bad">Held</Badge>}
                      </td>
                      <td className={tdClass}>{when(q.oldestAt)}</td>
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
