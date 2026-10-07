"use client";

import { BellRing, Info, Send, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { messageOf } from "@/components/auth/post-json";
import { Button } from "@/components/ui/Button";
import {
  loadPushStatus,
  pushState,
  sendTestPush,
  turnOffPush,
  turnOnPush,
  type PushState,
  type PushStatus,
} from "@/lib/push-client";

const WORDS: Record<Exclude<PushState, "off" | "on">, string> = {
  unsupported: "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari.",
  "install-first":
    "On iPhone and iPad, add Àjọ to your Home Screen first (tap Share, then Add to Home Screen), open it from there, then turn this on.",
  blocked:
    "Notifications are blocked for Àjọ in this browser. Allow them in your browser or phone settings, then come back.",
};

/**
 * Pushes to this phone: turn them on or off here. Only this one browser is changed; the lock screen
 * shows a message's title and nothing else, so nothing private shows over a shoulder.
 */
export function PushCard() {
  const [status, setStatus] = useState<PushStatus | "failed">();
  const [state, setState] = useState<PushState>();
  const [busy, setBusy] = useState<"on" | "off" | "test">();
  const [error, setError] = useState<string>();
  const [note, setNote] = useState<string>();

  useEffect(() => {
    let live = true;
    (async () => {
      const [api, here] = await Promise.all([loadPushStatus(), pushState()]);
      if (!live) return;
      setStatus(api.ok ? api.data : "failed");
      setState(here);
    })();
    return () => {
      live = false;
    };
  }, []);

  async function turnOn(key: string) {
    setError(undefined);
    setNote(undefined);
    setBusy("on");
    try {
      const result = await turnOnPush(key);
      if (typeof result === "object") setError(messageOf(result.error));
      else setState(result);
    } catch {
      setError("We couldn't turn notifications on. Try again.");
    }
    setBusy(undefined);
  }

  async function turnOff() {
    setError(undefined);
    setNote(undefined);
    setBusy("off");
    try {
      await turnOffPush();
      setState("off");
    } catch {
      setError("We couldn't turn notifications off. Try again.");
    }
    setBusy(undefined);
  }

  async function test() {
    setError(undefined);
    setNote(undefined);
    setBusy("test");
    const result = await sendTestPush();
    setBusy(undefined);
    if (result.ok) setNote("Sent. It should arrive in a moment.");
    else setError(messageOf(result));
  }

  const ready = status !== undefined && state !== undefined;
  const available = status !== undefined && status !== "failed" && status.enabled;

  return (
    <section
      aria-labelledby="push"
      className="grid gap-3 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
          <BellRing aria-hidden className="size-5" />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <h2 id="push" className="text-[15px] font-semibold">
            Push notifications
          </h2>
          <p className="text-[13px] leading-[18px] text-ink-muted">
            {state === "on"
              ? "On for this phone."
              : "Get a message on your lock screen when something needs you."}
          </p>
        </div>
      </div>

      {!ready && (
        <div
          role="status"
          aria-label="Checking"
          className="h-11 animate-pulse rounded-m bg-surface-sunken"
        />
      )}
      {ready && !available && (
        <p className="flex gap-2 text-[14px] leading-5 text-ink-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {status === "failed"
            ? "We couldn't check this. Check your connection and reopen the screen."
            : "Push notifications aren't switched on yet."}
        </p>
      )}
      {ready && available && state !== "off" && state !== "on" && (
        <p className="flex gap-2 text-[14px] leading-5 text-ink-muted">
          <Smartphone aria-hidden className="mt-0.5 size-4 shrink-0" />
          {WORDS[state]}
        </p>
      )}
      {ready && available && state === "off" && (
        <Button
          size="lg"
          block
          loading={busy === "on"}
          disabled={!!busy}
          onClick={() => void turnOn(status.publicKey ?? "")}
        >
          {busy === "on" ? "Turning on…" : "Turn on notifications"}
        </Button>
      )}
      {ready && available && state === "on" && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="quiet"
            loading={busy === "test"}
            disabled={!!busy}
            onClick={() => void test()}
          >
            <Send aria-hidden className="size-4" />
            Send a test
          </Button>
          <Button
            variant="quiet"
            loading={busy === "off"}
            disabled={!!busy}
            onClick={() => void turnOff()}
          >
            Turn off
          </Button>
        </div>
      )}
      {note && (
        <p role="status" className="text-[14px] font-medium text-leaf">
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[14px] font-medium text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
