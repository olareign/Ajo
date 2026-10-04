"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { messageOf, postJson } from "./post-json";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;
    setError(undefined);
    setBusy(true);
    const result = await postJson("/api/auth/forgot-password", { email: email.trim() });
    if (result.ok) setSentTo(email.trim());
    else setError(messageOf(result));
    setBusy(false);
  }

  if (sentTo) {
    // Said the same way whether or not the address has an account, so this cannot be used to find out.
    return (
      <div className="flex flex-1 flex-col">
        <div className="grid justify-items-center gap-4 pt-10 text-center">
          <MailCheck aria-hidden className="size-10 text-primary" />
          <h2 className="font-display text-[26px] leading-8 font-bold text-primary">
            Check your email
          </h2>
          <p className="text-[17px] leading-[26px] text-ink-muted">
            If {sentTo} has an account, we&apos;ve sent a link to choose a new password. It works
            for 1 hour.
          </p>
          <p className="text-[15px] leading-6 text-ink-muted">
            Nothing yet? Check your spam folder, then ask for another link in a minute.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="mt-auto flex min-h-14 items-center justify-center rounded-m bg-primary px-6 text-base font-semibold text-on-primary hover:bg-primary-deep"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <TextField
        label="Email"
        placeholder="name@example.com"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={setEmail}
        error={error}
        required
      />
      <div className="mt-auto pt-8">
        <Button type="submit" size="lg" block disabled={busy || !email.trim()}>
          {busy ? "One moment…" : "Send me email"}
        </Button>
      </div>
    </form>
  );
}
