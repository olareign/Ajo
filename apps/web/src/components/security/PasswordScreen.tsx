"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf } from "@/components/auth/post-json";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { changePassword } from "@/lib/security-client";
import { signedOut } from "./MfaSetup";

export function PasswordScreen() {
  return <MeGate needs="onboarded">{(me) => <ChangePassword me={me} />}</MeGate>;
}

/**
 * A new password from inside the app: the current one first, and the authenticator code when it is
 * on. This phone stays signed in; every other device is signed out.
 */
function ChangePassword({ me }: Readonly<{ me: Me }>) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const needsCode = me.mfaEnabled === true;
  const ready = current && next.length >= 12 && (!needsCode || code.length === 6);

  async function save() {
    setError(undefined);
    setBusy(true);
    const result = await changePassword({
      currentPassword: current,
      newPassword: next,
      ...(needsCode ? { code } : {}),
    });
    setBusy(false);
    if (result.ok) {
      setDone(true);
      setCurrent("");
      setNext("");
      setCode("");
      return;
    }
    if (signedOut(result)) return router.replace("/sign-in");
    setError(messageOf(result));
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title="Password"
        subtitle="Choose a new password. This phone stays signed in; every other device is signed out."
        backHref="/me"
      />
      {done ? (
        <div className="grid gap-4">
          <p
            role="status"
            className="flex items-center gap-3 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] leading-6 text-leaf"
          >
            <Check aria-hidden className="size-5 shrink-0" />
            Password changed. Other devices were signed out, and we emailed you.
          </p>
          <Button variant="quiet" size="lg" block onClick={() => router.push("/me")}>
            Back to Me
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
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={setCurrent}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={setNext}
            hint="At least 12 characters. A few words strung together works well."
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
          {error && (
            <p role="alert" className="text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" block loading={busy} disabled={busy || !ready}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </form>
      )}
    </main>
  );
}
