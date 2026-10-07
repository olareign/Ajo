"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { post } from "@/lib/admin-client";

export function AuthFrame({
  title,
  subtitle,
  children,
}: Readonly<{ title: string; subtitle: string; children: React.ReactNode }>) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-sm content-center gap-6 px-4 py-10">
      <div className="grid justify-items-start gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-primary-tint text-primary">
          <ShieldCheck aria-hidden className="size-6" />
        </span>
        <h1 className="font-display text-[28px] leading-9 font-bold tracking-[-0.015em]">
          {title}
        </h1>
        <p className="text-[15px] leading-6 text-ink-muted">{subtitle}</p>
      </div>
      {children}
      <p className="text-[12px] leading-5 text-ink-muted">
        Staff only. Everything you do here is recorded.
      </p>
    </main>
  );
}

/** Password and a code from the authenticator app, together. The answer never says which was wrong. */
export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const ready = email.includes("@") && password.length > 0 && /^\d{6}$/.test(code);

  async function submit() {
    setError(undefined);
    setBusy(true);
    const result = await post("auth/login", { email, password, code });
    if (result.ok) return router.replace("/");
    setBusy(false);
    setCode("");
    setError(result.failure.message);
  }

  return (
    <AuthFrame title="Sign in" subtitle="Your password, and the code from your authenticator app.">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) void submit();
        }}
      >
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <TextField
          label="Authenticator code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, ""))}
        />
        {error && (
          <p role="alert" className="text-[15px] font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" block loading={busy} disabled={busy || !ready}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <Link href="/setup" className="text-[14px] font-semibold text-primary">
        First time? Use your setup code
      </Link>
    </AuthFrame>
  );
}
