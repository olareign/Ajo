"use client";

import Link from "next/link";
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
    if (result.status === 403 && result.data.code === "email_not_verified") {
      // The API has just sent a fresh link; the next page says so and offers to send another.
      const query = new URLSearchParams({ e: email.trim(), from: "sign-in" });
      router.push(`/check-email?${query}`);
      return;
    }
    setError(messageOf(result));
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <div className="grid gap-5">
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
          placeholder="Enter your password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={error}
          required
        />
        <Link
          href="/forgot-password"
          className="-mt-2 justify-self-end rounded-s px-1 py-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <div className="mt-auto pt-8">
        <Button type="submit" size="lg" block loading={busy} disabled={busy || !email || !password}>
          {busy ? "One moment…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
