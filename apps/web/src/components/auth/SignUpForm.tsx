"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { messageOf, postJson } from "./post-json";

const MIN_LENGTH = 12;

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if ([...password].length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters. A few words strung together works well.`);
      return;
    }
    setError(undefined);
    setBusy(true);
    const result = await postJson("/api/auth/sign-up", { email: email.trim(), password });
    if (result.ok) {
      router.push(`/check-email?e=${encodeURIComponent(email.trim())}`);
      return;
    }
    setError(messageOf(result));
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={setEmail}
        required
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hint="At least 12 characters. A phrase is easier to remember than symbols."
        error={error}
        required
      />
      <Button type="submit" size="lg" block disabled={busy || !email || !password}>
        Create account
      </Button>
    </form>
  );
}
