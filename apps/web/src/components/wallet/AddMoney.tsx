"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { AmountPad } from "@/components/ui/AmountPad";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { OptionCards } from "@/components/ui/OptionCards";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { Receipt } from "@/components/ui/Receipt";
import { FUND_METHODS, QUICK_AMOUNTS, SAMPLE, toMinor } from "@/lib/money-flow";
import { leaveFor } from "@/lib/navigate";
import { newAttemptKey, startFunding } from "@/lib/payments-client";
import { PREVIEW_CHECK_MS, pause } from "@/lib/preview";
import { FlowLocked } from "./FlowLocked";
import { useMoneyFlow } from "./MoneyFlow";

type Step = "method" | "details" | "amount" | "review" | "done";

const ARRIVES: Record<string, string> = {
  card: "Straight away",
  ussd: "Within a few minutes",
  transfer: "When your bank confirms",
};

/** Adding money: pick how, say how much, look it over, and watch the coin land. */
export function AddMoney() {
  const flow = useMoneyFlow();
  const router = useRouter();
  const { preview, country, currency, locale, lock } = flow;
  // One key for as long as the person is making the same payment: tapping twice, or trying again
  // after the connection dropped, is answered with the first result instead of charging twice.
  const attempt = useRef({ signature: "", key: "" });
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [needsKyc, setNeedsKyc] = useState(false);

  // Coming back with the browser's back button restores this page as it was, still "taking you to pay".
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  const closed = lock("fund");
  if (closed) return <FlowLocked lock={closed} title="Add money" path="/wallet/add" />;

  const methods = FUND_METHODS[country];
  const chosen = methods.find((m) => m.value === method);
  const inbound = SAMPLE.inbound[country];
  const minor = toMinor(amount);

  function back() {
    setStep(
      step === "review" ? "amount" : step === "amount" || step === "details" ? "method" : step,
    );
  }

  async function add() {
    setError(undefined);
    setNeedsKyc(false);
    setBusy(true);
    if (preview) {
      await pause(PREVIEW_CHECK_MS);
      setBusy(false);
      return setStep("done");
    }
    if (!chosen) return setBusy(false);
    const signature = `${chosen.value}:${minor}`;
    if (attempt.current.signature !== signature) {
      attempt.current = { signature, key: newAttemptKey() };
    }
    const result = await startFunding({
      amount: minor,
      method: chosen.value,
      key: attempt.current.key,
    });
    if (!result.ok) {
      setBusy(false);
      if (result.failure.kind === "signed-out") return router.replace("/sign-in");
      if (result.failure.kind === "refused" && result.failure.code === "kyc_required") {
        setNeedsKyc(true);
      }
      return setError(result.failure.message);
    }
    // The partner hosts the step where the person pays; they come back to a screen that follows it.
    const { id, action } = result.data;
    if (action && leaveFor(action.url)) return; // stays busy: the page is going away
    router.push(`/wallet/add/return?id=${encodeURIComponent(id)}`);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Blocked clipboards: the details are on screen to type.
    }
  }

  if (step === "done") {
    return (
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
        {preview && <PreviewRibbon exitHref="/wallet" />}
        <div className="grid justify-items-center gap-6 pt-6 text-center">
          <div className="relative w-[256px] pt-6">
            <span
              key={minor}
              className="scene-coin absolute -top-1 right-2 z-10 grid size-14 place-items-center rounded-full bg-oro font-display text-[26px] font-bold text-on-oro shadow-lift"
            >
              {currency === "NGN" ? "₦" : "£"}
            </span>
            <div className="grid gap-1 rounded-[var(--radius-l)] bg-surface-raised p-5 text-left shadow-lift">
              <p className="text-[13px] font-semibold tracking-[0.04em] text-ink-muted">WALLET</p>
              <Amount amount={minor} currency={currency} locale={locale} size="xl" />
              <p className="text-[13px] text-ink-muted">added{preview ? " (preview)" : ""}</p>
            </div>
          </div>
          <h1 className="font-display text-[28px] leading-9 font-bold text-primary">Money added</h1>
          <ButtonLink href="/wallet" size="lg" block>
            Back to my wallet
          </ButtonLink>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/wallet/add" />}
      <ScreenHeader
        title={
          step === "method"
            ? "Add money"
            : step === "details"
              ? "Send it from your bank"
              : step === "amount"
                ? "How much?"
                : "Look it over"
        }
        subtitle={step === "method" ? "Pick how you'd like to pay." : undefined}
        onBack={step === "method" ? undefined : back}
        backHref={step === "method" ? "/wallet" : undefined}
      />

      {step === "method" && (
        <div className="grid gap-6">
          <OptionCards
            label="How to add money"
            options={methods}
            value={method}
            onChange={setMethod}
          />
          <Button
            size="lg"
            block
            disabled={!method}
            // A live bank transfer is set up on the partner's page, so only a preview shows the
            // sample account here.
            onClick={() => setStep(method === "transfer" && preview ? "details" : "amount")}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "details" && (
        <div className="grid gap-5">
          <div className="relative grid gap-3 rounded-[var(--radius-l)] bg-primary-tint p-5">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-2 rounded-[calc(var(--radius-l)-8px)] border-[1.5px] border-dashed border-primary/35"
            />
            <p className="text-[13px] font-semibold text-tertiary">
              Your own Àjọ account{preview ? " (sample)" : ""}
            </p>
            <dl className="grid gap-2 text-[15px]">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Bank</dt>
                <dd className="font-semibold">{inbound.bank}</dd>
              </div>
              {inbound.sortCode && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Sort code</dt>
                  <dd className="font-mono font-semibold">{inbound.sortCode}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Account number</dt>
                <dd className="font-mono font-semibold">{inbound.number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Name</dt>
                <dd className="font-semibold">{flow.me.displayName.toUpperCase()}</dd>
              </div>
            </dl>
            <Button variant="quiet" onClick={() => void copy(inbound.number)}>
              {copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
              {copied ? "Copied" : "Copy account number"}
            </Button>
          </div>
          <p className="text-[15px] leading-6 text-ink-muted">
            Send any amount from your bank app. It shows in your wallet when your bank confirms.
            Only send from an account in your own name.
          </p>
          <ButtonLink href="/wallet" variant="quiet" size="lg" block>
            Back to my wallet
          </ButtonLink>
        </div>
      )}

      {step === "amount" && (
        <div className="grid gap-6">
          <AmountPad
            value={amount}
            onChange={setAmount}
            currency={currency}
            locale={locale}
            label="Amount to add"
            quick={QUICK_AMOUNTS[country]}
          />
          <Button
            size="lg"
            block
            disabled={toMinor(amount) === "0"}
            onClick={() => setStep("review")}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "review" && chosen && (
        <div className="grid gap-6">
          <Receipt
            title="You're adding"
            rows={[
              { label: "To", value: `Your wallet (${currency})` },
              { label: "How", value: chosen.title },
              { label: "Arrives", value: ARRIVES[chosen.value] ?? "Soon" },
            ]}
            total={{
              label: "You pay",
              value: <Amount amount={minor} currency={currency} locale={locale} size="m" />,
            }}
            stamp={preview ? "Preview" : undefined}
          />
          {error && (
            <p role="alert" className="text-center text-[15px] font-medium text-danger">
              {error}
              {needsKyc && (
                <>
                  {" "}
                  <Link href="/verify" className="underline underline-offset-4">
                    Go to my passport
                  </Link>
                </>
              )}
            </p>
          )}
          <Button size="lg" block loading={busy} disabled={busy} onClick={() => void add()}>
            {busy ? (preview ? "Adding…" : "Taking you to pay…") : "Add money"}
          </Button>
          {!preview && (
            <p className="text-center text-[12px] leading-5 text-ink-muted">
              You&apos;ll finish paying on our payment partner&apos;s secure page, then come back
              here.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
