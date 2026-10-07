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
import type { CaseDetail } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export function CaseScreen({ id }: Readonly<{ id: string }>) {
  const can = useCan();
  const { state, reload } = useLoad(() => get<CaseDetail>(`cases/${id}`), id);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [noteError, setNoteError] = useState<string>();
  const [closing, setClosing] = useState(false);
  const [outcome, setOutcome] = useState<"resolved" | "written_off">("resolved");
  const write = can("cases:write");

  async function addNote() {
    setNoteError(undefined);
    setSaving(true);
    const result = await post(`cases/${id}/notes`, { note: note.trim() });
    setSaving(false);
    if (!result.ok) return setNoteError(result.failure.message);
    setNote("");
    reload();
  }

  return (
    <>
      <Link
        href="/cases"
        className="mb-4 inline-flex items-center gap-1 text-[14px] font-semibold text-primary"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Cases
      </Link>
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <>
          <PageHeader
            title={`${state.data.member.name}: ${state.data.group.name}`}
            subtitle={`Round ${state.data.round}, opened ${when(state.data.openedAt)}`}
            action={
              <div className="flex items-center gap-3">
                <Badge tone={statusTone(state.data.status)}>{words(state.data.status)}</Badge>
                {write && state.data.status === "open" && (
                  <Button onClick={() => setClosing(true)}>Record the outcome</Button>
                )}
              </div>
            }
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="The money">
              <dl className="grid gap-3 sm:grid-cols-3">
                <Fact label="Missed">
                  <span className="tabular-nums">
                    {money(state.data.amountOwed, state.data.currency)}
                  </span>
                </Fact>
                <Fact label="Covered by deposit">
                  <span className="tabular-nums">
                    {money(state.data.coveredByDeposit, state.data.currency)}
                  </span>
                </Fact>
                <Fact label="Still owed">
                  <strong className="tabular-nums">
                    {money(state.data.stillOwed, state.data.currency)}
                  </strong>
                </Fact>
              </dl>
              <p className="text-[13px] text-ink-muted">
                Recording an outcome only says what happened. It moves no money.
              </p>
            </Card>
            <Card
              title="The member"
              action={
                can("users:read") ? (
                  <Link
                    href={`/users/${state.data.member.id}`}
                    className="text-[14px] font-semibold text-primary"
                  >
                    Open
                  </Link>
                ) : undefined
              }
            >
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact label="Email">{state.data.member.email}</Fact>
                <Fact label="Username">
                  {state.data.memberDetails.username
                    ? `@${state.data.memberDetails.username}`
                    : "–"}
                </Fact>
                <Fact label="Phone">{state.data.memberDetails.phone ?? "–"}</Fact>
                <Fact label="Country">{state.data.memberDetails.country ?? "–"}</Fact>
                <Fact label="Account">
                  <Badge tone={statusTone(state.data.memberDetails.accountStatus)}>
                    {words(state.data.memberDetails.accountStatus)}
                  </Badge>
                </Fact>
                <Fact label="Identity">
                  {words(state.data.memberDetails.kycStatus)}, level{" "}
                  {state.data.memberDetails.kycTier}
                </Fact>
              </dl>
            </Card>
            <div className="lg:col-span-2">
              <Card title="Notes">
                {state.data.notes.length === 0 ? (
                  <p className="text-ink-muted">No notes yet.</p>
                ) : (
                  <ul className="grid gap-3">
                    {state.data.notes.map((n) => (
                      <li key={n.id} className="grid gap-0.5 border-l-2 border-line pl-3">
                        <p className="text-[15px] whitespace-pre-wrap">{n.note}</p>
                        <p className="text-[12px] text-ink-muted">
                          {n.by}, {when(n.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {write && state.data.status === "open" && (
                  <form
                    className="grid gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (note.trim() && !saving) void addNote();
                    }}
                  >
                    <label className="grid gap-1.5 text-[14px] font-medium">
                      Add a note
                      <textarea
                        value={note}
                        maxLength={1000}
                        rows={3}
                        onChange={(e) => setNote(e.target.value)}
                        className="rounded-m border border-line-strong bg-surface p-3 text-[15px] font-normal"
                      />
                    </label>
                    {noteError && (
                      <p role="alert" className="text-[14px] font-medium text-danger">
                        {noteError}
                      </p>
                    )}
                    <div>
                      <Button
                        type="submit"
                        variant="quiet"
                        loading={saving}
                        disabled={saving || !note.trim()}
                      >
                        Save note
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
      {closing && (
        <ConfirmAction
          title="Record the outcome"
          description="Closes the case, once. It moves no money; it records how it ended."
          confirmLabel="Close the case"
          onConfirm={async (input) => {
            const result = await post(`cases/${id}/close`, { ...input, outcome });
            if (result.ok) {
              reload();
              return null;
            }
            return result.failure;
          }}
          onClose={() => setClosing(false)}
        >
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[14px] font-medium">How did it end?</legend>
            {(["resolved", "written_off"] as const).map((o) => (
              <label key={o} className="flex items-center gap-2 text-[15px]">
                <input
                  type="radio"
                  name="outcome"
                  checked={outcome === o}
                  onChange={() => setOutcome(o)}
                />
                {o === "resolved"
                  ? "Resolved: the money was recovered"
                  : "Written off: it won't be recovered"}
              </label>
            ))}
          </fieldset>
        </ConfirmAction>
      )}
    </>
  );
}
