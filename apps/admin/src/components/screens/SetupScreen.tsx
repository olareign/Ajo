"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { QrCode } from "@/components/ui/QrCode";
import { TextField } from "@/components/ui/TextField";
import { post } from "@/lib/admin-client";
import { AuthFrame } from "./LoginScreen";

type Started = Readonly<{ secret: string; otpauthUri: string }>;

/**
 * Joining: the one-time setup code the owner gave you and a password, then the key for the
 * authenticator app and a code to prove it works. Nothing else opens until that is done.
 */
export function SetupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [started, setStarted] = useState<Started>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const mismatch = again.length > 0 && again !== password;
  const ready =
    email.includes("@") && setupCode.length >= 10 && password.length >= 14 && again === password;

  async function start() {
    setError(undefined);
    setBusy(true);
    const result = await post<Started>("auth/setup/start", { email, setupCode, password });
    setBusy(false);
    if (
      result.ok &&
      typeof result.data.secret === "string" &&
      typeof result.data.otpauthUri === "string"
    ) {
      return setStarted(result.data);
    }
    setError(
      result.ok ? "The server gave an answer we didn't expect. Try again." : result.failure.message,
    );
  }

  async function finish() {
    setError(undefined);
    setBusy(true);
    const result = await post("auth/setup/confirm", { email, setupCode, code });
    if (result.ok) return router.replace("/");
    setBusy(false);
    setCode("");
    setError(result.failure.message);
  }

  if (started) {
    return (
      <AuthFrame
        title="Connect your authenticator"
        subtitle="Scan this with an authenticator app, or type the key in. Then enter the 6-digit code it shows."
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{6}$/.test(code) && !busy) void finish();
          }}
        >
          <QrCode
            value={started.otpauthUri}
            label="QR code for your authenticator app"
            className="mx-auto size-48 rounded-m border border-line"
          />
          <p className="text-center font-mono text-[14px] break-all select-all">{started.secret}</p>
          <TextField
            label="Code from the app"
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
          <Button
            type="submit"
            size="lg"
            block
            loading={busy}
            disabled={busy || !/^\d{6}$/.test(code)}
          >
            {busy ? "Checking…" : "Finish and sign in"}
          </Button>
        </form>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Join the team"
      subtitle="Use the setup code the owner gave you (good for one day), and choose a password."
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) void start();
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
          label="Setup code"
          autoComplete="off"
          value={setupCode}
          onChange={setSetupCode}
        />
        <TextField
          label="Choose a password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint="At least 14 characters. A few unrelated words works well."
        />
        <TextField
          label="Password again"
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={setAgain}
          error={mismatch ? "The two passwords are different." : undefined}
        />
        {error && (
          <p role="alert" className="text-[15px] font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" block loading={busy} disabled={busy || !ready}>
          {busy ? "One moment…" : "Continue"}
        </Button>
      </form>
    </AuthFrame>
  );
}
