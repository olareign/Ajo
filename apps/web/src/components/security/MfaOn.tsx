"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf, postJson } from "@/components/auth/post-json";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { signedOut } from "./MfaSetup";

/** The second lock is on. Turning it off needs the password and a code, so a borrowed phone can't. */
export function MfaOn() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function turnOff() {
    setError(undefined);
    setBusy(true);
    const result = await postJson("/api/auth/mfa/totp", { password, code }, "DELETE");
    if (result.ok) return router.replace("/me");
    setBusy(false);
    if (signedOut(result)) return router.replace("/sign-in");
    setError(messageOf(result));
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title="Your second lock is on"
        subtitle="You enter a code from your phone when you sign in on a new device, and before any money moves."
        backHref="/me"
      />
      <div className="grid grid-cols-1 gap-6">
        <div className="flex items-center gap-4 rounded-[var(--radius-l)] bg-leaf-tint p-5 text-leaf">
          <ShieldCheck aria-hidden className="size-8 shrink-0" />
          <p className="text-[15px] leading-6 font-semibold">
            Authenticator app: on. Lost your phone? Use one of your spare keys to get in.
          </p>
        </div>

        <Button
          variant="danger"
          size="lg"
          block
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Turn off
        </Button>
        {open && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (password && code.length === 6 && !busy) void turnOff();
            }}
            className="grid grid-cols-1 gap-4 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4"
          >
            <p className="text-[15px] leading-[22px] text-ink">
              Without it, your account is protected by your password alone, and you can&apos;t move
              money until you turn it back on.
            </p>
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
            />
            <TextField
              label="Code from your app"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value.replace(/\D/g, ""))}
            />
            {error && (
              <p role="alert" className="text-[14px] font-medium text-danger">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="danger"
              disabled={busy || !password || code.length !== 6}
            >
              {busy ? "One moment…" : "Turn off the second lock"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
