"use client";

import { Check, Copy, UserPlus } from "lucide-react";
import { useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
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
import { get, post } from "@/lib/admin-client";
import { when, words } from "@/lib/format";
import type { Role, SetupCodeResult, TeamMember } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const ROLES: readonly { value: Role; hint: string }[] = [
  { value: "support", hint: "Look people up, suspend an account, read cases" },
  { value: "compliance", hint: "Identity decisions, reinstate, the audit log" },
  { value: "finance", hint: "Recovery cases: notes and outcomes" },
  { value: "owner", hint: "Everything, including adding staff" },
];

type Acting =
  Readonly<{ kind: "invite" }> | Readonly<{ kind: "reissue" | "disable"; member: TeamMember }>;

/** The code a new member needs, shown once, to pass to them yourself. */
function SetupCodePanel({
  who,
  result,
  onDone,
}: Readonly<{ who: string; result: SetupCodeResult; onDone: () => void }>) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      role="status"
      className="grid gap-3 rounded-[var(--radius-l)] border-[1.5px] border-oro/50 bg-oro-tint p-5"
    >
      <p className="text-[15px] font-semibold text-oro-ink">Setup code for {who}</p>
      <p className="font-mono text-[22px] tracking-wider select-all">{result.setupCode}</p>
      <p className="text-[13px] leading-5 text-oro-ink">
        Shown only now. Give it to them yourself (not by email or chat history you can&apos;t
        clear); it works once and expires {when(result.expiresAt)}. They open the console, choose{" "}
        <strong>First time? Use your setup code</strong>.
      </p>
      <div className="flex gap-3">
        <Button
          variant="quiet"
          onClick={() => {
            void navigator.clipboard?.writeText(result.setupCode).then(() => setCopied(true));
          }}
        >
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button onClick={onDone}>I&apos;ve passed it on</Button>
      </div>
    </div>
  );
}

export function TeamScreen() {
  const me = useAdmin();
  const { state, reload } = useLoad(() => get<TeamMember[]>("team"));
  const [acting, setActing] = useState<Acting>();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("support");
  const [code, setCode] = useState<{ who: string; result: SetupCodeResult }>();

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Everyone who can sign in here. Only owners see this page."
        action={
          <Button
            onClick={() => {
              setEmail("");
              setName("");
              setRole("support");
              setActing({ kind: "invite" });
            }}
          >
            <UserPlus aria-hidden className="size-5" />
            Add someone
          </Button>
        }
      />
      {code && (
        <div className="mb-5">
          <SetupCodePanel who={code.who} result={code.result} onDone={() => setCode(undefined)} />
        </div>
      )}
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <Card>
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Member</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Last signed in</th>
                  <th className={thClass}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((m) => (
                  <tr key={m.id}>
                    <td className={tdClass}>
                      <span className="font-semibold">{m.name}</span>
                      <div className="text-[13px] text-ink-muted">{m.email}</div>
                    </td>
                    <td className={tdClass}>{words(m.role)}</td>
                    <td className={tdClass}>
                      <Badge tone={statusTone(m.status)}>{words(m.status)}</Badge>
                    </td>
                    <td className={tdClass}>{when(m.lastLoginAt)}</td>
                    <td className={tdClass}>
                      {m.id !== me.id && m.status !== "disabled" && (
                        <span className="flex gap-2">
                          <Button
                            variant="quiet"
                            onClick={() => setActing({ kind: "reissue", member: m })}
                          >
                            Reset
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setActing({ kind: "disable", member: m })}
                          >
                            Turn off
                          </Button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {acting?.kind === "invite" && (
        <ConfirmAction
          title="Add someone to the team"
          description="You'll get a one-time setup code to pass to them."
          confirmLabel="Add"
          reason={false}
          ready={email.includes("@") && name.trim().length > 0}
          onConfirm={async ({ code: otp }) => {
            const result = await post<SetupCodeResult>("team", {
              email,
              name: name.trim(),
              role,
              code: otp,
            });
            if (!result.ok) return result.failure;
            setCode({ who: email, result: result.data });
            reload();
            return null;
          }}
          onClose={() => setActing(undefined)}
        >
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="off"
          />
          <TextField label="Name" value={name} onChange={setName} autoComplete="off" />
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[14px] font-medium">Role</legend>
            {ROLES.map((r) => (
              <label key={r.value} className="flex items-start gap-2 text-[14px]">
                <input
                  type="radio"
                  name="role"
                  className="mt-1"
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                />
                <span>
                  <strong>{words(r.value)}</strong>
                  <span className="block text-ink-muted">{r.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </ConfirmAction>
      )}
      {acting && acting.kind !== "invite" && (
        <ConfirmAction
          title={
            acting.kind === "reissue"
              ? `Reset ${acting.member.name}`
              : `Turn off ${acting.member.name}`
          }
          description={
            acting.kind === "reissue"
              ? "Wipes their password and authenticator and signs them out. They start again with a new setup code. Use it for a lost phone."
              : "They are signed out now and can't sign in again."
          }
          confirmLabel={acting.kind === "reissue" ? "Reset" : "Turn off"}
          danger
          reason={false}
          onConfirm={async ({ code: otp }) => {
            const result = await post<SetupCodeResult>(`team/${acting.member.id}/${acting.kind}`, {
              code: otp,
            });
            if (!result.ok) return result.failure;
            if (acting.kind === "reissue")
              setCode({ who: acting.member.email, result: result.data });
            reload();
            return null;
          }}
          onClose={() => setActing(undefined)}
        />
      )}
    </>
  );
}
