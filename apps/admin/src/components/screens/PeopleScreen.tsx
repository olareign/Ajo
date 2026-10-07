"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader, tableClass, tdClass, thClass } from "@/components/ui/Page";
import { TextField } from "@/components/ui/TextField";
import { get } from "@/lib/admin-client";
import { when, words } from "@/lib/format";
import type { PersonSummary } from "@/lib/types";
import { useRouter } from "next/navigation";

/**
 * Find a person by their whole email, or the start of their username. Each search is recorded in the
 * audit log, because it is a look at personal details.
 */
export function PeopleScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [found, setFound] = useState<readonly PersonSummary[]>();
  const ready = q.trim().length >= 3;

  async function search() {
    setError(undefined);
    setBusy(true);
    const result = await get<PersonSummary[]>("users/search", { q: q.trim() });
    setBusy(false);
    if (result.ok) return setFound(result.data);
    if (result.failure.signedOut) return router.replace("/login");
    setFound(undefined);
    setError(result.failure.message);
  }

  return (
    <>
      <PageHeader
        title="People"
        subtitle="Search by the whole email, or the start of a username (3 letters or more)."
      />
      <form
        className="mb-6 flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) void search();
        }}
      >
        <div className="grow">
          <TextField label="Email or username" value={q} onChange={setQ} autoComplete="off" />
        </div>
        <Button type="submit" size="lg" loading={busy} disabled={busy || !ready}>
          <Search aria-hidden className="size-5" />
          Search
        </Button>
      </form>
      {error && (
        <p role="alert" className="mb-4 text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
      {found && (
        <Card>
          {found.length === 0 ? (
            <p className="text-ink-muted">Nobody matches that.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Name</th>
                    <th className={thClass}>Username</th>
                    <th className={thClass}>Email</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {found.map((p) => (
                    <tr key={p.id}>
                      <td className={tdClass}>
                        <Link href={`/users/${p.id}`} className="font-semibold text-primary">
                          {p.displayName}
                        </Link>
                      </td>
                      <td className={tdClass}>{p.username ? `@${p.username}` : "–"}</td>
                      <td className={tdClass}>{p.email}</td>
                      <td className={tdClass}>
                        <Badge tone={statusTone(p.status)}>{words(p.status)}</Badge>
                      </td>
                      <td className={tdClass}>{when(p.createdAt)}</td>
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
