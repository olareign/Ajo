"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { messageOf, postJson } from "./post-json";

const MIN_LENGTH = 12;
const DEAD_LINK = /invalid or has expired/i;

export function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if ([...password].length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters. A few words strung together works well.`);
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await postJson("/api/auth/reset-password", { token, password });
    if (result.ok) setDone(true);
    else setError(messageOf(result));
    setBusy(false);
  }

  if (done) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="grid justify-items-center gap-4 pt-10 text-center">
          <ShieldCheck aria-hidden className="size-10 text-leaf" />
          <h2 className="font-display text-[26px] leading-8 font-bold text-primary">
            Password changed
          </h2>
          <p className="text-[17px] leading-[26px] text-ink-muted">
            You&apos;ve been signed out everywhere. Sign in with your new password.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="mt-auto flex min-h-14 items-center justify-center rounded-m bg-primary px-6 text-base font-semibold text-on-primary hover:bg-primary-deep"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <div className="grid gap-4">
        <TextField
          label="New password"
          placeholder="Choose a new password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint="At least 12 characters. A phrase is easier to remember than symbols."
          error={error}
          required
        />
        {error && DEAD_LINK.test(error) && (
          <Link
            href="/forgot-password"
            className="justify-self-start text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            Ask for a new link
          </Link>
        )}
      </div>
      <div className="mt-auto pt-8">
        <Button type="submit" size="lg" block loading={busy} disabled={busy || !password}>
          {busy ? "One moment…" : "Save new password"}
        </Button>
      </div>
    </form>
  );
}
