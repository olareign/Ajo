"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCan } from "@/components/AdminProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { Card, Fact, Failed, Loading, PageHeader } from "@/components/ui/Page";
import { get, post } from "@/lib/admin-client";
import { money, when, words } from "@/lib/format";
import type { PersonDetail } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export function PersonScreen({ id }: Readonly<{ id: string }>) {
  const can = useCan();
  const { state, reload } = useLoad(() => get<PersonDetail>(`users/${id}`), id);
  const [acting, setActing] = useState<"suspend" | "reinstate">();

  return (
    <>
      <Link
        href="/users"
        className="mb-4 inline-flex items-center gap-1 text-[14px] font-semibold text-primary"
      >
        <ArrowLeft aria-hidden className="size-4" />
        People
      </Link>
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <>
          <PageHeader
            title={state.data.displayName}
            subtitle={state.data.username ? `@${state.data.username}` : "No username yet"}
            action={
              <div className="flex items-center gap-3">
                <Badge tone={statusTone(state.data.status)}>{words(state.data.status)}</Badge>
                {state.data.status === "active" && can("users:suspend") && (
                  <Button variant="danger" onClick={() => setActing("suspend")}>
                    Suspend
                  </Button>
                )}
                {state.data.status === "suspended" && can("users:reinstate") && (
                  <Button onClick={() => setActing("reinstate")}>Reinstate</Button>
                )}
              </div>
            }
          />
          {state.data.statusNote && (
            <p className="mb-4 rounded-[var(--radius-l)] bg-oro-tint p-4 text-[14px] text-oro-ink">
              <strong>Note on the account:</strong> {state.data.statusNote}
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Details">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact label="Email">
                  {state.data.email}{" "}
                  <Badge tone={state.data.emailVerified ? "good" : "warn"}>
                    {state.data.emailVerified ? "Confirmed" : "Not confirmed"}
                  </Badge>
                </Fact>
                <Fact label="Phone">
                  {state.data.phone ? (
                    <>
                      {state.data.phone}{" "}
                      <Badge tone={state.data.phoneVerified ? "good" : "warn"}>
                        {state.data.phoneVerified ? "Verified" : "Not verified"}
                      </Badge>
                    </>
                  ) : (
                    "–"
                  )}
                </Fact>
                <Fact label="Country">{state.data.country ?? "–"}</Fact>
                <Fact label="Goal">{state.data.goal ? words(state.data.goal) : "–"}</Fact>
                <Fact label="Joined">{when(state.data.createdAt)}</Fact>
                {state.data.closedAt && <Fact label="Closed">{when(state.data.closedAt)}</Fact>}
              </dl>
            </Card>
            <Card
              title="Identity"
              action={
                can("kyc:read") ? (
                  <Link href={`/kyc/${id}`} className="text-[14px] font-semibold text-primary">
                    Open
                  </Link>
                ) : undefined
              }
            >
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact label="Status">
                  <Badge tone={statusTone(state.data.kyc.status)}>
                    {words(state.data.kyc.status)}
                  </Badge>
                </Fact>
                <Fact label="Level">{state.data.kyc.tier}</Fact>
                <Fact label="Decided by">
                  {state.data.kyc.via === "checks"
                    ? "The checks"
                    : state.data.kyc.via === "waived"
                      ? "Approved by hand"
                      : "Held by hand"}
                </Fact>
                <Fact label="Hand override">
                  {state.data.kyc.override ? words(state.data.kyc.override) : "None"}
                </Fact>
              </dl>
            </Card>
            <Card title="Money held">
              {state.data.balances.length === 0 ? (
                <p className="text-ink-muted">Nothing yet.</p>
              ) : (
                <dl className="grid gap-3 sm:grid-cols-3">
                  {state.data.balances.map((b) => (
                    <Fact
                      key={`${b.currency}-${b.kind}`}
                      label={`${words(b.kind)} (${b.currency})`}
                    >
                      <span className="tabular-nums">{money(b.amount, b.currency)}</span>
                    </Fact>
                  ))}
                </dl>
              )}
            </Card>
            <Card title="Going on now">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact label="Saving plans">{state.data.activePlans}</Fact>
                <Fact label="Circles">{state.data.activeCircles}</Fact>
                <Fact label="Open cases">{state.data.openCases}</Fact>
                <Fact label="Signed-in devices">{state.data.activeSessions}</Fact>
              </dl>
            </Card>
            <Card title="Recent security events">
              {state.data.recentSecurity.length === 0 ? (
                <p className="text-ink-muted">None.</p>
              ) : (
                <ul className="grid gap-1.5 text-[14px]">
                  {state.data.recentSecurity.map((e, i) => (
                    <li key={`${e.at}-${i}`} className="flex justify-between gap-3">
                      <span>{words(e.kind)}</span>
                      <span className="text-ink-muted">{when(e.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
      {acting && (
        <ConfirmAction
          title={acting === "suspend" ? "Suspend this account" : "Reinstate this account"}
          description={
            acting === "suspend"
              ? "They are signed out of every device now and can't sign in. Their money is not touched, and they are not told."
              : "They will be able to sign in again."
          }
          confirmLabel={acting === "suspend" ? "Suspend" : "Reinstate"}
          danger={acting === "suspend"}
          onConfirm={async (input) => {
            const result = await post(`users/${id}/${acting}`, input);
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
