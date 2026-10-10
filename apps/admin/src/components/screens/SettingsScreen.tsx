"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { Card, Fact, Failed, Loading, PageHeader } from "@/components/ui/Page";
import { TextField } from "@/components/ui/TextField";
import { get, post } from "@/lib/admin-client";
import { when } from "@/lib/format";
import type { SupportContact } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

/** A plain address: what the API accepts too (it is the one that decides). */
const PLAIN_EMAIL = /^[^\s@<>"]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;

/**
 * What customers see that staff can change without a deploy. For now, the support email shown on
 * Help, Safety and the legal pages. Customers see a change within about a minute.
 */
export function SettingsScreen() {
  const { state, reload } = useLoad(() => get<SupportContact>("settings"));
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState<string>();
  const next = email.trim().toLowerCase();

  return (
    <>
      <PageHeader title="Settings" subtitle="What customers see. Only owners see this page." />
      {saved && (
        <p
          role="status"
          className="mb-5 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] text-leaf"
        >
          Saved. Customers will see {saved} within a minute.
        </p>
      )}
      {state.phase === "loading" && <Loading />}
      {state.phase === "failed" && <Failed failure={state.failure} retry={reload} />}
      {state.phase === "ready" && (
        <Card
          title="Support email"
          action={
            <Button
              variant="quiet"
              onClick={() => {
                setEmail(state.data.supportEmail);
                setSaved(undefined);
                setEditing(true);
              }}
            >
              Change
            </Button>
          }
        >
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            <Mail aria-hidden className="size-5 text-primary" />
            {state.data.supportEmail}
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact label="Shown on">Help, Safety, the terms and privacy notice, every footer</Fact>
            <Fact label="Last changed">
              {state.data.updatedAt
                ? `${when(state.data.updatedAt)} by ${state.data.updatedBy ?? "a former member"}`
                : "Never: this is the built-in address"}
            </Fact>
          </dl>
          <p className="text-[13px] leading-5 text-ink-muted">
            Use an inbox the team reads every day. People write here about their money, so it must
            be an address Àjọ controls.
          </p>
        </Card>
      )}
      {editing && state.phase === "ready" && (
        <ConfirmAction
          title="Change the support email"
          description="Customers write to this address for help. The change, and your reason, go in the audit log."
          confirmLabel="Save"
          ready={PLAIN_EMAIL.test(next) && next !== state.data.supportEmail}
          onConfirm={async ({ code, reason }) => {
            const result = await post("settings/support-email", { email: next, code, reason });
            if (!result.ok) return result.failure;
            setSaved(next);
            reload();
            return null;
          }}
          onClose={() => setEditing(false)}
        >
          <TextField
            label="New address"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="off"
          />
        </ConfirmAction>
      )}
    </>
  );
}
