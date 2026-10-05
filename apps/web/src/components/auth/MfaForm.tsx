"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CodeBoxes } from "@/components/ui/CodeBoxes";
import { Keypad } from "@/components/ui/Keypad";
import { TextField } from "@/components/ui/TextField";
import { messageOf, postJson } from "./post-json";
import { takeReturn } from "@/lib/return-to";

const CODE_LENGTH = 6;
const EXPIRED = /start again/i;

/** Second step of signing in: the 6-digit code from the authenticator app, or a recovery code. */
export function MfaForm() {
  const router = useRouter();
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  // Ticked by default: asking on every sign-in would be the thing people give up on.
  const [remember, setRemember] = useState(true);

  const ready = useRecovery ? recovery.trim().length > 0 : code.length === CODE_LENGTH;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setError(undefined);
    setBusy(true);
    const result = await postJson(
      "/api/auth/mfa",
      useRecovery
        ? { recoveryCode: recovery.trim(), trustDevice: remember }
        : { code, trustDevice: remember },
    );
    if (result.ok) {
      router.push(takeReturn() ?? "/today");
      return;
    }
    setError(messageOf(result));
    setCode("");
    setBusy(false);
  }

  function switchTo(recoveryMode: boolean) {
    setUseRecovery(recoveryMode);
    setError(undefined);
    setCode("");
    setRecovery("");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <div className="grid gap-6">
        {useRecovery ? (
          <TextField
            label="Recovery code"
            placeholder="xxxxx-xxxxx"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={recovery}
            onChange={setRecovery}
            hint="One of the codes you saved when you turned on the extra step. Each works once."
            error={error}
          />
        ) : (
          <CodeBoxes label="Authenticator code" value={code} length={CODE_LENGTH} error={error} />
        )}
        {error && EXPIRED.test(error) && (
          <Link
            href="/sign-in"
            className="justify-self-start text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        )}
        <label className="flex items-start gap-3 text-[15px] leading-6">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
          />
          <span>
            Don&apos;t ask again on this device
            <span className="block text-[13px] leading-5 text-ink-muted">
              For 30 days. Money still needs a code every time.
            </span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => switchTo(!useRecovery)}
          className="justify-self-center rounded-s px-2 py-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
        >
          {useRecovery ? "Use my authenticator app" : "Use a recovery code"}
        </button>
      </div>
      <div className="mt-auto grid gap-4 pt-6">
        <Button type="submit" size="lg" block loading={busy} disabled={!ready || busy}>
          {busy ? "One moment…" : "Confirm"}
        </Button>
        {!useRecovery && (
          <Keypad value={code} onChange={setCode} length={CODE_LENGTH} label="Number pad" />
        )}
      </div>
    </form>
  );
}
