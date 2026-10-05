"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf } from "@/components/auth/post-json";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { changePin, resetPin } from "@/lib/security-client";
import { signedOut } from "./MfaSetup";

export function PinScreen() {
  return <MeGate needs="onboarded">{(me) => <Pin me={me} />}</MeGate>;
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

/**
 * The transaction PIN: change it with the current one, or, if it is forgotten, set a new one with the
 * password and an authenticator code (which must be on: a password alone is not enough).
 */
function Pin({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  const [mode, setMode] = useState<"change" | "reset">("change");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const mismatch = again.length === 6 && next !== again;
  const ready =
    next.length === 6 &&
    next === again &&
    (mode === "change" ? current.length === 6 : Boolean(password) && code.length === 6);

  async function save() {
    setError(undefined);
    setBusy(true);
    const result =
      mode === "change"
        ? await changePin({ currentPin: current, newPin: next })
        : await resetPin({ password, code, newPin: next });
    setBusy(false);
    if (result.ok) return setDone(true);
    if (signedOut(result)) return router.replace("/sign-in");
    setError(messageOf(result));
  }

  function switchTo(next: "change" | "reset") {
    setMode(next);
    setError(undefined);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title={mode === "change" ? "Transaction PIN" : "Forgot your PIN"}
        subtitle={
          mode === "change"
            ? "The six digits you enter before money moves."
            : "Set a new PIN with your password and a code from your authenticator app."
        }
        backHref="/me"
      />
      {done ? (
        <div className="grid gap-4">
          <p
            role="status"
            className="flex items-center gap-3 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] leading-6 text-leaf"
          >
            <Check aria-hidden className="size-5 shrink-0" />
            Your new PIN is set. We emailed you about the change.
          </p>
          <Button variant="quiet" size="lg" block onClick={() => router.push("/me")}>
            Back to Me
          </Button>
        </div>
      ) : mode === "reset" && !me.mfaEnabled ? (
        <div className="grid gap-4">
          <p className="rounded-[var(--radius-l)] bg-oro-tint p-4 text-[15px] leading-6 text-oro-ink">
            To reset a forgotten PIN, turn on the authenticator app first. A password alone
            isn&apos;t enough to change how money is approved.
          </p>
          <Link
            href="/me/security"
            className="text-center text-[15px] font-semibold text-primary underline underline-offset-4"
          >
            Turn on the authenticator app
          </Link>
          <Button variant="quiet" onClick={() => switchTo("change")}>
            I remember my PIN
          </Button>
        </div>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) void save();
          }}
        >
          {mode === "change" ? (
            <TextField
              label="Current PIN"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={current}
              onChange={(v) => setCurrent(digits(v))}
            />
          ) : (
            <>
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
              />
              <TextField
                label="Code from your authenticator app"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(v) => setCode(digits(v))}
              />
            </>
          )}
          <TextField
            label="New PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={next}
            onChange={(v) => setNext(digits(v))}
            hint="Six digits. Not a repeat, a run like 123456, or a pair."
          />
          <TextField
            label="New PIN again"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={again}
            onChange={(v) => setAgain(digits(v))}
            error={mismatch ? "The two PINs don't match." : undefined}
          />
          {error && (
            <p role="alert" className="text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" block loading={busy} disabled={busy || !ready}>
            {busy ? "Saving…" : "Set new PIN"}
          </Button>
          {mode === "change" ? (
            <Button variant="quiet" onClick={() => switchTo("reset")}>
              Forgot your PIN?
            </Button>
          ) : (
            <Button variant="quiet" onClick={() => switchTo("change")}>
              I remember my PIN
            </Button>
          )}
        </form>
      )}
    </main>
  );
}
