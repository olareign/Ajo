"use client";

import { CalendarClock, Landmark, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { cn } from "@/lib/cn";
import { mandateCopy, SAMPLE } from "@/lib/money-flow";
import { leaveFor } from "@/lib/navigate";
import {
  cancelMandate,
  loadMandate,
  startMandate,
  type Failure,
  type MandateView,
} from "@/lib/payments-client";
import { POLL_EVERY_MS, POLL_LIMIT } from "@/lib/use-payment";
import { PREVIEW_CHECK_MS, pause } from "@/lib/preview";
import { FlowLocked } from "./FlowLocked";
import { useMoneyFlow } from "./MoneyFlow";

type State = "none" | "pending" | "active" | "cancelled" | "failed";

const LOOK: Record<State, { word: string; tone: string }> = {
  none: { word: "Not set up", tone: "bg-surface-sunken text-ink-muted" },
  pending: { word: "Waiting for your bank", tone: "bg-tertiary-tint text-tertiary" },
  active: { word: "Active", tone: "bg-leaf-tint text-leaf" },
  cancelled: { word: "Cancelled", tone: "bg-danger-tint text-danger" },
  failed: { word: "Didn't go through", tone: "bg-danger-tint text-danger" },
};

/** Auto-debit: one permission, given once, so saving and circle payments can be collected on time. */
export function Mandate() {
  const { preview, country, lock } = useMoneyFlow();
  const router = useRouter();
  const [pretend, setPretend] = useState<State>("none");
  // Live: what the API says. `undefined` is "not asked yet"; `null` is "none, ever".
  const [real, setReal] = useState<MandateView | null>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const closed = lock("mandate");

  function problem(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    setError(failure.message);
  }

  // Live: ask what the person's auto-debit is, and keep asking while the bank has not confirmed (the
  // partner returns the person here, and tells our server by itself when it is done).
  const watching = !preview && !closed;
  const pending = real?.status === "pending";
  useEffect(() => {
    if (!watching || (real !== undefined && !pending)) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const look = async () => {
      const result = await loadMandate();
      if (!live) return;
      tries += 1;
      if (!result.ok) {
        if (result.failure.kind === "unreachable" && tries < POLL_LIMIT) {
          timer = setTimeout(() => void look(), POLL_EVERY_MS);
          return;
        }
        return problem(result.failure);
      }
      setReal(result.data);
      if (result.data?.status === "pending" && tries < POLL_LIMIT) {
        timer = setTimeout(() => void look(), POLL_EVERY_MS);
      }
    };
    void look();
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // `problem` only reads stable setters and the router; the loop restarts when the status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watching, pending, real === undefined]);

  if (closed) return <FlowLocked lock={closed} title="Auto-debit" path="/wallet/mandate" />;

  const state: State = preview
    ? pretend
    : real === null || real === undefined
      ? "none"
      : real.status;
  const copy = mandateCopy(country);
  const account = SAMPLE.account[country];

  async function setUp() {
    setError(undefined);
    if (preview) {
      setPretend("pending");
      await pause(PREVIEW_CHECK_MS * 1.5);
      return setPretend("active");
    }
    setBusy(true);
    const result = await startMandate();
    if (!result.ok) {
      setBusy(false);
      return problem(result.failure);
    }
    setReal(result.data);
    // The bank's own page is where permission is given; the person comes back to this screen.
    if (result.data.action && leaveFor(result.data.action.url)) return;
    setBusy(false);
  }

  async function cancel() {
    setError(undefined);
    setConfirming(false);
    if (preview) return setPretend("cancelled");
    setBusy(true);
    const result = await cancelMandate();
    setBusy(false);
    if (!result.ok) return problem(result.failure);
    setReal(result.data);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/wallet/mandate" />}
      <ScreenHeader
        title="Auto-debit"
        subtitle="Give permission once, so payments leave on their date and nobody is chased."
        backHref="/wallet"
      />
      <div className="grid gap-6">
        <section
          aria-label="Your auto-debit"
          className="relative grid gap-4 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-ink-muted">
              <CalendarClock aria-hidden className="size-4" />
              STANDING PERMISSION
            </p>
            <span
              data-state={state}
              className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", LOOK[state].tone)}
            >
              {LOOK[state].word}
            </span>
          </div>
          <p className="flex items-center gap-3 font-display text-[22px] leading-7 font-semibold">
            <Landmark aria-hidden className="size-6 text-primary" />
            {preview ? `${account.bank} •••• ${account.last4}` : "Your bank account"}
          </p>
          <p className="border-t-2 border-dashed border-line pt-4 text-[14px] leading-5 text-ink-muted">
            {copy.scheme}
          </p>
        </section>

        <p className="flex gap-3 text-[15px] leading-6">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          {copy.how}
        </p>

        {error && (
          <p role="alert" className="text-center text-[15px] font-medium text-danger">
            {error}
          </p>
        )}
        {!preview && real === undefined && !error && (
          <p role="status" className="text-center text-[15px] text-ink-muted">
            Loading…
          </p>
        )}
        {state === "none" && (!preview ? real !== undefined : true) && (
          <Button size="lg" block disabled={busy} onClick={() => void setUp()}>
            {busy ? "Taking you to your bank…" : "Set up auto-debit"}
          </Button>
        )}
        {state === "pending" && (
          <div className="grid gap-3">
            <p role="status" className="text-center text-[15px] text-ink-muted">
              Waiting for your bank to confirm…
            </p>
            {!preview && real?.action && (
              <Button
                variant="quiet"
                onClick={() => {
                  if (real.action) leaveFor(real.action.url);
                }}
              >
                Open my bank&apos;s page again
              </Button>
            )}
          </div>
        )}
        {state === "active" && (
          <div className="grid gap-3">
            <p className="text-[14px] leading-5 text-ink-muted">{copy.guarantee}</p>
            <Button
              variant="danger"
              size="lg"
              block
              aria-expanded={confirming}
              onClick={() => setConfirming((c) => !c)}
            >
              Cancel auto-debit
            </Button>
            {confirming && (
              <div className="grid gap-4 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4">
                <p className="text-[15px] leading-[22px]">
                  Cancelling stops all future collections. You can&apos;t cancel while you&apos;re
                  in an active saving plan or circle, because those payments depend on it.
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-3">
                  <Button variant="quiet" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                  <Button variant="danger" disabled={busy} onClick={() => void cancel()}>
                    Cancel it
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {(state === "cancelled" || state === "failed") && (
          <Button size="lg" block disabled={busy} onClick={() => void setUp()}>
            {state === "failed" ? "Try again" : "Set it up again"}
          </Button>
        )}
      </div>
    </main>
  );
}
