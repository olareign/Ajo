"use client";

import { CalendarClock, Landmark, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { cn } from "@/lib/cn";
import { mandateCopy, SAMPLE } from "@/lib/money-flow";
import { PREVIEW_CHECK_MS, pause } from "@/lib/preview";
import { FlowLocked } from "./FlowLocked";
import { useMoneyFlow } from "./MoneyFlow";

type State = "none" | "pending" | "active" | "cancelled";

const LOOK: Record<State, { word: string; tone: string }> = {
  none: { word: "Not set up", tone: "bg-surface-sunken text-ink-muted" },
  pending: { word: "Waiting for your bank", tone: "bg-tertiary-tint text-tertiary" },
  active: { word: "Active", tone: "bg-leaf-tint text-leaf" },
  cancelled: { word: "Cancelled", tone: "bg-danger-tint text-danger" },
};

/** Auto-debit: one permission, given once, so saving and circle payments can be collected on time. */
export function Mandate() {
  const { preview, country, lock } = useMoneyFlow();
  const [state, setState] = useState<State>("none");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();

  const closed = lock("mandate");
  if (closed) return <FlowLocked lock={closed} title="Auto-debit" path="/wallet/mandate" />;

  const copy = mandateCopy(country);
  const account = SAMPLE.account[country];

  async function setUp() {
    setError(undefined);
    // A real mandate is set up with the bank through the partner. Until that is wired to this
    // screen, only a preview may pretend.
    if (!preview)
      return setError("Auto-debit isn't switched on for this screen yet. Nothing was set up.");
    setState("pending");
    await pause(PREVIEW_CHECK_MS * 1.5);
    setState("active");
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
            {account.bank} •••• {account.last4}
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
        {state === "none" && (
          <Button size="lg" block onClick={() => void setUp()}>
            Set up auto-debit
          </Button>
        )}
        {state === "pending" && (
          <p role="status" className="text-center text-[15px] text-ink-muted">
            Waiting for your bank to confirm…
          </p>
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
                  <Button
                    variant="danger"
                    onClick={() => {
                      setConfirming(false);
                      setState("cancelled");
                    }}
                  >
                    Cancel it
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {state === "cancelled" && (
          <Button size="lg" block onClick={() => void setUp()}>
            Set it up again
          </Button>
        )}
      </div>
    </main>
  );
}
