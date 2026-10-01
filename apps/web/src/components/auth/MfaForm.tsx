"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CodeBoxes } from "@/components/ui/CodeBoxes";
import { Keypad } from "@/components/ui/Keypad";
import { TextField } from "@/components/ui/TextField";
import { messageOf, postJson } from "./post-json";

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

  const ready = useRecovery ? recovery.trim().length > 0 : code.length === CODE_LENGTH;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    setError(undefined);
    setBusy(true);
    const result = await postJson(
      "/api/auth/mfa",
      useRecovery ? { recoveryCode: recovery.trim() } : { code },
    );
    if (result.ok) {
      router.push("/today");
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
            className="justify-self-start text-[15px] font-semibold text-adire underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        )}
        <button
          type="button"
          onClick={() => switchTo(!useRecovery)}
          className="justify-self-center rounded-s px-2 py-2 text-[15px] font-semibold text-adire underline-offset-4 hover:underline"
        >
          {useRecovery ? "Use my authenticator app" : "Use a recovery code"}
        </button>
      </div>
      <div className="mt-auto grid gap-4 pt-6">
        <Button type="submit" size="lg" block disabled={!ready || busy}>
          {busy ? "One moment…" : "Confirm"}
        </Button>
        {!useRecovery && (
          <Keypad value={code} onChange={setCode} length={CODE_LENGTH} label="Number pad" />
        )}
      </div>
    </form>
  );
}
