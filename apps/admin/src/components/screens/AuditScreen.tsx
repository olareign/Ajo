"use client";

import { useState } from "react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  Failed,
  Loading,
  PageHeader,
  tableClass,
  tdClass,
  thClass,
} from "@/components/ui/Page";
import { TextField } from "@/components/ui/TextField";
import { get } from "@/lib/admin-client";
import { when } from "@/lib/format";
import type { AuditItem } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

type Page = Readonly<{ items: readonly AuditItem[]; next: string | null }>;

/** Everything staff have done, newest first. It cannot be edited or emptied. Reading it is recorded too. */
export function AuditScreen() {
  const [admin, setAdmin] = useState("");
  const [action, setAction] = useState("");
  const [target, setTarget] = useState("");
  const [applied, setApplied] = useState({ admin: "", action: "", target: "" });
  const { state, reload } = useLoad(
    () =>
      get<Page>("audit", { admin: applied.admin, action: applied.action, target: applied.target }),
    `${applied.admin}|${applied.action}|${applied.target}`,
  );
  const [more, setMore] = useState<readonly AuditItem[]>([]);
  const [next, setNext] = useState<string | null | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string>();

  const first = state.phase === "ready" ? state.data : undefined;
  const cursor = next === undefined ? (first?.next ?? null) : next;
  const items = first ? [...first.items, ...more] : [];

  async function loadMore() {
    if (!cursor) return;
    setMoreError(undefined);
    setLoadingMore(true);
    const result = await get<Page>("audit", { ...applied, before: cursor });
    setLoadingMore(false);
    if (!result.ok) return setMoreError(result.failure.message);
    setMore((m) => [...m, ...result.data.items]);
    setNext(result.data.next);
  }

  function apply() {
    setMore([]);
    setNext(undefined);
    setApplied({ admin: admin.trim(), action: action.trim(), target: target.trim() });
  }

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every look and every change, by whom and when. It can't be edited or emptied."
      />
      <form
        className="mb-5 grid gap-3 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <TextField label="Who (email)" value={admin} onChange={setAdmin} autoComplete="off" />
        <TextField
          label="Action starts with"
          value={action}
          onChange={setAction}
          autoComplete="off"
          hint="e.g. user. or kyc."
        />
        <TextField label="Target id" value={target} onChange={setTarget} autoComplete="off" />
        <div className="flex items-end">
          <Button type="submit" size="lg" block>
            Filter
          </Button>
        </div>
      </form>
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <Card>
          {items.length === 0 ? (
            <p className="text-ink-muted">Nothing matches.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>When</th>
                    <th className={thClass}>Who</th>
                    <th className={thClass}>Action</th>
                    <th className={thClass}>Target</th>
                    <th className={thClass}>Outcome</th>
                    <th className={thClass}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className={tdClass}>{when(i.at)}</td>
                      <td className={tdClass}>
                        {i.admin_email}
                        <div className="text-[12px] text-ink-muted">{i.role}</div>
                      </td>
                      <td className={tdClass}>
                        <code className="font-mono text-[13px]">{i.action}</code>
                      </td>
                      <td className={tdClass}>
                        {i.target_id ? (
                          <span className="font-mono text-[12px] break-all">
                            {i.target_type}: {i.target_id}
                          </span>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className={tdClass}>
                        <Badge tone={statusTone(i.outcome)}>{i.outcome}</Badge>
                      </td>
                      <td className={tdClass}>
                        {Object.keys(i.detail).length === 0 ? (
                          "–"
                        ) : (
                          <code className="font-mono text-[12px] break-all">
                            {JSON.stringify(i.detail)}
                          </code>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {moreError && (
            <p role="alert" className="text-[14px] font-medium text-danger">
              {moreError}
            </p>
          )}
          {cursor && (
            <div>
              <Button
                variant="quiet"
                loading={loadingMore}
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                Load older
              </Button>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
