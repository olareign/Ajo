"use client";

import { Check, Copy, Lock, Smartphone, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf, postJson, type PostResult } from "@/components/auth/post-json";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { CodeBoxes } from "@/components/ui/CodeBoxes";
import { Keypad } from "@/components/ui/Keypad";
import { QrCode } from "@/components/ui/QrCode";
import { Stitches } from "@/components/ui/Stitches";
import { RecoveryTicket } from "./RecoveryTicket";

const CODE_LENGTH = 6;

type Phase =
  | { kind: "intro" }
  | { kind: "scan"; secret: string; uri: string }
  | { kind: "code"; secret: string; uri: string }
  | { kind: "saved"; codes: string[] };

const DONE: Record<Phase["kind"], number> = { intro: 0, scan: 0, code: 1, saved: 2 };

/** A refusal with a `code` is an answer about the request, not a lost session. */
export const signedOut = (result: PostResult) =>
  result.status === 401 && typeof result.data.code !== "string";

const STEPS = [
  {
    icon: Smartphone,
    title: "Get an app",
    detail: "Google Authenticator, Authy or 1Password all work.",
  },
  {
    icon: Sparkles,
    title: "Scan one square",
    detail: "Your app starts making a new 6-digit code every 30 seconds.",
  },
  {
    icon: Lock,
    title: "Save your spare keys",
    detail: "Ten one-use codes, in case you lose your phone.",
  },
] as const;

const group = (secret: string) => secret.match(/.{1,4}/g)?.join(" ") ?? secret;

export function MfaSetup() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function start() {
    setError(undefined);
    setBusy(true);
    const result = await postJson("/api/auth/mfa/totp", {});
    setBusy(false);
    if (signedOut(result)) return router.replace("/sign-in");
    if (!result.ok) return setError(messageOf(result));
    setPhase({
      kind: "scan",
      secret: String(result.data.secret),
      uri: String(result.data.otpauthUri),
    });
  }

  async function confirm() {
    if (phase.kind !== "code") return;
    setError(undefined);
    setBusy(true);
    const result = await postJson("/api/auth/mfa/totp/confirm", { code });
    setBusy(false);
    if (signedOut(result)) return router.replace("/sign-in");
    if (!result.ok) {
      setError(messageOf(result));
      setCode("");
      return;
    }
    setPhase({ kind: "saved", codes: result.data.recoveryCodes as string[] });
  }

  async function copyKey(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copying can be blocked; the key is on screen to type in.
    }
  }

  const back =
    phase.kind === "scan"
      ? () => setPhase({ kind: "intro" })
      : phase.kind === "code"
        ? () => {
            setError(undefined);
            setCode("");
            setPhase({ kind: "scan", secret: phase.secret, uri: phase.uri });
          }
        : undefined;

  const heading = {
    intro: {
      title: "Add a second lock",
      subtitle:
        "A code from your phone, on top of your password. It's needed before you can move money.",
    },
    scan: {
      title: "Scan with your app",
      subtitle: "Open your authenticator app, add an account, and point it at the square.",
    },
    code: { title: "Enter the code", subtitle: "Type the 6 digits your app is showing for Àjọ." },
    saved: {
      title: "Keep your spare keys",
      subtitle: "Each one works once if you lose your phone. We can't show them again.",
    },
  }[phase.kind];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <ScreenHeader
        title={heading.title}
        subtitle={heading.subtitle}
        onBack={back}
        backHref={phase.kind === "intro" ? "/me" : undefined}
      />
      <div className="flex flex-1 flex-col gap-6">
        {phase.kind !== "saved" && (
          <Stitches total={3} done={DONE[phase.kind]} label="Setup progress" />
        )}

        {phase.kind === "intro" && (
          <ol className="grid grid-cols-1 gap-3">
            {STEPS.map(({ icon: Icon, title, detail }, i) => (
              <li
                key={title}
                className="pop-in flex items-start gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
                style={{ "--pop-delay": `${i * 90}ms` } as React.CSSProperties}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="grid gap-0.5">
                  <span className="text-[15px] font-semibold">{title}</span>
                  <span className="text-[14px] leading-5 text-ink-muted">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
        )}

        {phase.kind === "scan" && (
          <>
            <div className="relative grid place-items-center rounded-[var(--radius-l)] bg-primary-tint p-6">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-2 rounded-[calc(var(--radius-l)-8px)] border-[1.5px] border-dashed border-primary/35"
              />
              <QrCode
                value={phase.uri}
                label="QR code for your authenticator app"
                className="pop-in size-56 max-w-full rounded-m"
              />
            </div>
            <div className="grid gap-2">
              <p className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">
                Can&apos;t scan? Type this key into your app
              </p>
              <p className="rounded-m bg-surface-sunken p-4 font-mono text-[15px] leading-6 break-words text-ink">
                {group(phase.secret)}
              </p>
              <Button variant="quiet" onClick={() => void copyKey(phase.secret)}>
                {copied ? (
                  <Check aria-hidden className="size-4" />
                ) : (
                  <Copy aria-hidden className="size-4" />
                )}
                {copied ? "Copied" : "Copy key"}
              </Button>
            </div>
          </>
        )}

        {phase.kind === "code" && (
          <CodeBoxes label="Code from your authenticator app" value={code} error={error} />
        )}

        {phase.kind === "saved" && (
          <>
            <RecoveryTicket codes={phase.codes} />
            <label className="flex items-start gap-3 text-[15px] leading-6">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
              />
              I&apos;ve saved these codes somewhere safe
            </label>
          </>
        )}

        {error && phase.kind !== "code" && (
          <p role="alert" className="text-center text-[15px] font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-auto grid gap-4 pt-2">
          {phase.kind === "intro" && (
            <Button size="lg" block disabled={busy} onClick={() => void start()}>
              {busy ? "One moment…" : "Start"}
            </Button>
          )}
          {phase.kind === "scan" && (
            <Button
              size="lg"
              block
              onClick={() => setPhase({ kind: "code", secret: phase.secret, uri: phase.uri })}
            >
              I&apos;ve added it
            </Button>
          )}
          {phase.kind === "code" && (
            <>
              <Button
                size="lg"
                block
                disabled={busy || code.length !== CODE_LENGTH}
                onClick={() => void confirm()}
              >
                {busy ? "One moment…" : "Confirm"}
              </Button>
              <Keypad value={code} onChange={setCode} length={CODE_LENGTH} label="Number pad" />
            </>
          )}
          {phase.kind === "saved" && (
            <Button size="lg" block disabled={!saved} onClick={() => router.replace("/me")}>
              Done
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
