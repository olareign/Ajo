"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { messageOf, postJson } from "./post-json";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    const result = await postJson("/api/auth/sign-in", { email: email.trim(), password });
    if (result.ok) {
      router.push(result.data.mfaRequired === true ? "/sign-in/verify" : "/today");
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
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={error}
        required
      />
      <Button type="submit" size="lg" block disabled={busy || !email || !password}>
        Sign in
      </Button>
    </form>
  );
}
