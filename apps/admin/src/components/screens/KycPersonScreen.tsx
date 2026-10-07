"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCan } from "@/components/AdminProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import {
  Card,
  Fact,
  Failed,
  Loading,
  PageHeader,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui/Page";
import { get, post } from "@/lib/admin-client";
import { when, words } from "@/lib/format";
import type { KycDetail } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

type Acting =
  | Readonly<{ kind: "step"; step: string; decision: "approved" | "rejected" }>
  | Readonly<{ kind: "override"; action: "approve" | "deny" | "clear" }>;

const OVERRIDE_WORDS = {
  approve: "Approve without the checks",
  deny: "Hold back",
  clear: "Clear the override",
} as const;

export function KycPersonScreen({ id }: Readonly<{ id: string }>) {
  const can = useCan();
  const { state, reload } = useLoad(() => get<KycDetail>(`kyc/${id}`), id);
  const [acting, setActing] = useState<Acting>();
  const decide = can("kyc:decide");

  return (
    <>
      <Link
        href="/kyc"
        className="mb-4 inline-flex items-center gap-1 text-[14px] font-semibold text-primary"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Identity
      </Link>
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <>
          <PageHeader
            title={state.data.displayName}
            subtitle={`${state.data.email}${state.data.country ? ` · ${state.data.country}` : ""}`}
            action={
              can("users:read") ? (
                <Link href={`/users/${id}`} className="text-[14px] font-semibold text-primary">
                  Open the person
                </Link>
              ) : undefined
            }
          />
          <div className="grid gap-5">
            <Card title="Where they stand">
              <dl className="grid gap-3 sm:grid-cols-4">
                <Fact label="Status">
                  <Badge tone={statusTone(state.data.status)}>{words(state.data.status)}</Badge>
                </Fact>
                <Fact label="Level">{state.data.tier}</Fact>
                <Fact label="Decided by">
                  {state.data.via === "checks"
                    ? "The checks"
                    : state.data.via === "waived"
                      ? "Approved by hand"
                      : "Held by hand"}
                </Fact>
                <Fact label="Hand override">
                  {state.data.override ? words(state.data.override) : "None"}
                </Fact>
              </dl>
            </Card>
            <Card title="Steps">
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Step</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Reason</th>
                      <th className={thClass}>Updated</th>
                      <th className={thClass}>
                        <span className="sr-only">Decide</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.steps.map((s) => (
                      <tr key={s.step}>
                        <td className={tdClass}>{words(s.step)}</td>
                        <td className={tdClass}>
                          <Badge tone={statusTone(s.status)}>{words(s.status)}</Badge>
                        </td>
                        <td className={tdClass}>{s.reason ?? "–"}</td>
                        <td className={tdClass}>{when(s.updatedAt)}</td>
                        <td className={tdClass}>
                          {decide && s.status === "pending" && (
                            <span className="flex gap-2">
                              <Button
                                onClick={() =>
                                  setActing({ kind: "step", step: s.step, decision: "approved" })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() =>
                                  setActing({ kind: "step", step: s.step, decision: "rejected" })
                                }
                              >
                                Reject
                              </Button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[13px] text-ink-muted">
                {state.data.documents.length === 0
                  ? "No documents are stored yet: identity checks aren't connected to a partner. Documents will open here through short-lived links once they are."
                  : `${state.data.documents.length} documents.`}
              </p>
            </Card>
            {decide && (
              <Card title="Decide by hand">
                <p className="text-[14px] text-ink-muted">
                  Approving here waives the checks for this one person; holding back refuses them
                  even if the checks pass. Every change is recorded with your reason.
                </p>
                <div className="flex flex-wrap gap-3">
                  {(["approve", "deny", "clear"] as const).map((action) => (
                    <Button
                      key={action}
                      variant={action === "deny" ? "danger" : "quiet"}
                      onClick={() => setActing({ kind: "override", action })}
                    >
                      {OVERRIDE_WORDS[action]}
                    </Button>
                  ))}
                </div>
                {state.data.overrideHistory.length > 0 && (
                  <ul className="grid gap-1 text-[13px] text-ink-muted">
                    {state.data.overrideHistory.map((h, i) => (
                      <li key={`${h.at}-${i}`}>
                        {when(h.at)}: {h.from ? words(h.from) : "none"} →{" "}
                        {h.to ? words(h.to) : "none"}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>
        </>
      )}
      {acting && (
        <ConfirmAction
          title={
            acting.kind === "step"
              ? `${acting.decision === "approved" ? "Approve" : "Reject"} ${words(acting.step).toLowerCase()}`
              : OVERRIDE_WORDS[acting.action]
          }
          description={
            acting.kind === "step" && acting.decision === "rejected"
              ? "The person is shown your reason, so write it for them."
              : undefined
          }
          confirmLabel={
            acting.kind === "step"
              ? acting.decision === "approved"
                ? "Approve"
                : "Reject"
              : "Confirm"
          }
          danger={
            (acting.kind === "step" && acting.decision === "rejected") ||
            (acting.kind === "override" && acting.action === "deny")
          }
          onConfirm={async (input) => {
            const result =
              acting.kind === "step"
                ? await post(`kyc/${id}/steps/${acting.step}`, {
                    ...input,
                    decision: acting.decision,
                  })
                : await post(`kyc/${id}/override`, { ...input, action: acting.action });
            if (result.ok) {
              reload();
              return null;
            }
            return result.failure;
          }}
          onClose={() => setActing(undefined)}
        />
      )}
    </>
  );
}
