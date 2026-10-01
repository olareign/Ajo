"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { messageOf, postJson } from "./post-json";

const MIN_LENGTH = 12;

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
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
    const result = await postJson("/api/auth/sign-up", {
      email: email.trim(),
      password,
      displayName: name.trim(),
    });
    if (result.ok) {
      router.push(`/check-email?e=${encodeURIComponent(email.trim())}`);
      return;
    }
    setError(messageOf(result));
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <div className="grid gap-5">
        <TextField
          label="Your name"
          placeholder="e.g. Adébáyọ̀ Ola"
          autoComplete="given-name"
          value={name}
          onChange={setName}
          hint="What should we call you?"
          maxLength={80}
          required
        />
        <TextField
          label="Email"
          placeholder="name@example.com"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          required
        />
        <TextField
          label="Password"
          placeholder="At least 12 characters"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint="At least 12 characters. A phrase is easier to remember than symbols."
          error={error}
          required
        />
      </div>
      {/* Pinned to the bottom of the screen, where the thumb is, like the buttons on the welcome screen. */}
      <div className="mt-auto pt-8">
        <Button
          type="submit"
          size="lg"
          block
          disabled={busy || !name.trim() || !email || !password}
        >
          {busy ? "One moment…" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
