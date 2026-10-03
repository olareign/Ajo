"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { messageOf, postJson } from "./post-json";

/** Matches the API's rule of one verification email per address a minute. */
export const RESEND_WAIT_SECONDS = 60;

function startWait() {
  const now = Date.now();
  return { now, until: now + RESEND_WAIT_SECONDS * 1000 };
}

const quietLink =
  "rounded-s px-1 py-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline";

/**
 * Where sign-up, and a sign-in before the email is confirmed, both land. A link has just been
 * sent, so asking for another waits a minute; the same wait applies on the server.
 */
export function CheckEmail({ email, from }: { email?: string; from?: "sign-in" }) {
  // The wait is a fixed end time compared with the clock, so it stays right when a background
  // tab throttles timers.
  const [clock, setClock] = useState(startWait);
  const wait = Math.max(0, Math.ceil((clock.until - clock.now) / 1000));
  const waiting = wait > 0;
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!waiting) return;
    const tick = setInterval(() => setClock((c) => ({ ...c, now: Date.now() })), 1000);
    return () => clearInterval(tick);
  }, [waiting]);

  async function resend() {
    if (!email || busy || waiting) return;
    setBusy(true);
    setSent(false);
    setError(undefined);
    const result = await postJson("/api/auth/resend-verification", { email });
    if (result.ok) setSent(true);
    else setError(messageOf(result));
    setClock(startWait());
    setBusy(false);
  }

  return (
    <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-16 pb-10 text-center">
      <Mail aria-hidden className="mx-auto size-10 text-primary" />
      <h1 className="font-display text-[32px] leading-9 font-bold tracking-[-0.015em] text-balance">
        Check your email
      </h1>
      <p className="text-[17px] leading-[26px] text-ink-muted">
        {from === "sign-in" ? "Please confirm your email before you sign in. " : ""}
        {email
          ? `We've sent a link to ${email}. It works for 24 hours, and you may need to look in your spam folder.`
          : "We've sent a link to confirm your email. It works for 24 hours."}
      </p>

      {email ? (
        <div className="mt-2 grid justify-items-center gap-2">
          <Button variant="quiet" size="lg" block disabled={busy || waiting} onClick={resend}>
            {busy ? "Sending…" : "Resend email"}
          </Button>
          {waiting && !busy ? (
            <p className="text-[15px] text-ink-muted">You can ask for another in {wait}s.</p>
          ) : null}
          {sent ? (
            <p role="status" className="text-[15px] font-semibold text-leaf">
              We&apos;ve sent a new link. The earlier one still works until it expires.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-x-4">
        <Link href="/sign-in" className={quietLink}>
          Back to sign in
        </Link>
        {email ? (
          <Link href="/sign-up" className={quietLink}>
            Use a different email
          </Link>
        ) : null}
      </div>
    </main>
  );
}
