"use client";

import { Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf, postJson } from "@/components/auth/post-json";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { signedOut } from "@/components/security/MfaSetup";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { closeAccount } from "@/lib/profile-client";

export function CloseAccountScreen() {
  return <MeGate needs="onboarded">{(me) => <CloseAccount me={me} />}</MeGate>;
}

const BEFORE = [
  "Your wallet, savings and deposits are empty",
  "No saving plan is still running",
  "You're not in a circle that is still going",
  "Auto-debit is cancelled, and no payment is on its way",
] as const;

/**
 * Closing the account, for good: only once nothing is left in it, and only with the password (and the
 * authenticator code when it is on). The API says what is still in the way, in words.
 */
function CloseAccount({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [closed, setClosed] = useState(false);
  const needsCode = me.mfaEnabled === true;
  const ready = sure && password && (!needsCode || code.length === 6);

  async function close() {
    setError(undefined);
    setBusy(true);
    const result = await closeAccount({ password, ...(needsCode ? { code } : {}) });
    if (!result.ok) {
      setBusy(false);
      if (signedOut(result)) return router.replace("/sign-in");
      return setError(messageOf(result));
    }
    // Every session ended on the API; clear this browser's cookie too.
    await postJson("/api/auth/sign-out", {});
    setBusy(false);
    setPassword("");
    setCode("");
    setClosed(true);
  }

  if (closed) {
    return (
      <main className="mx-auto grid w-full max-w-md gap-5 px-4 pt-16 pb-28 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-leaf-tint text-leaf">
          <Check aria-hidden className="size-8" />
        </span>
        <h1 className="font-display text-[26px] leading-8 font-bold">Your account is closed</h1>
        <p role="status" className="text-[15px] leading-6 text-ink-muted">
          You&apos;ve been signed out everywhere and we&apos;ve emailed you a confirmation.
        </p>
        <Link
          href="/"
          className="mx-auto inline-flex min-h-12 items-center rounded-[var(--radius-l)] px-5 font-semibold text-primary"
        >
          Done
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title="Close account"
        subtitle="This can't be undone. You won't be able to sign in again."
        backHref="/me"
      />
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) void close();
        }}
      >
        <section
          aria-labelledby="before"
          className="grid gap-3 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
        >
          <h2 id="before" className="text-[15px] font-semibold">
            Before you can close it
          </h2>
          <ul className="grid gap-2">
            {BEFORE.map((line) => (
              <li key={line} className="flex gap-2 text-[14px] leading-5 text-ink-muted">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                {line}
              </li>
            ))}
          </ul>
        </section>
        <TextField
          label="Your password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        {needsCode && (
          <TextField
            label="Code from your authenticator app"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, ""))}
          />
        )}
        <label className="flex items-start gap-3 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4 text-[15px] leading-[22px]">
          <input
            type="checkbox"
            checked={sure}
            onChange={(e) => setSure(e.target.checked)}
            className="mt-1 size-4 shrink-0 accent-[var(--color-danger)]"
          />
          I understand my account closes for good and I can&apos;t sign in again.
        </label>
        {error && (
          <p role="alert" className="flex gap-2 text-[15px] font-medium text-danger">
            <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="danger"
          size="lg"
          block
          loading={busy}
          disabled={busy || !ready}
        >
          {busy ? "Closing…" : "Close my account"}
        </Button>
      </form>
    </main>
  );
}
