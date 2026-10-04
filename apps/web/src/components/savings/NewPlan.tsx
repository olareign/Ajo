"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { AmountPad } from "@/components/ui/AmountPad";
import { Button } from "@/components/ui/Button";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { Receipt } from "@/components/ui/Receipt";
import { TextField } from "@/components/ui/TextField";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import { QUICK_AMOUNTS, toMinor } from "@/lib/money-flow";
import { newAttemptKey, loadMandate } from "@/lib/payments-client";
import { addDays, dayText, FREQUENCY_WORD, longDayText, MAX_DEBITS, todayIn } from "@/lib/schedule";
import type { Failure } from "@/lib/api-send";
import type { Frequency, PlanInput, PlanPreview } from "@/lib/savings-client";
import { Beads } from "./Beads";
import { Pot } from "./Pot";
import { useSavings, useSavingsLock } from "./SavingsFlow";

type Step = "name" | "amount" | "rhythm" | "review";

const IDEAS = ["Rent", "School fees", "New phone", "A trip", "Rainy day"];
const FREQUENCIES: readonly { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const COUNTS: Record<Frequency, readonly number[]> = {
  daily: [7, 14, 30, 90],
  weekly: [4, 8, 12, 26],
  monthly: [3, 6, 12, 24],
};
const START_CHOICES = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "In a week" },
  { value: "pick", label: "Pick a day" },
] as const;
type StartChoice = (typeof START_CHOICES)[number]["value"];

/** Starting a plan, one question at a time, with the pot that will hold it growing as the answers come. */
export function NewPlan() {
  const { preview, href, currency, locale, country } = useMoneyFlow();
  const gateway = useSavings();
  const router = useRouter();
  const lock = useSavingsLock();
  const today = todayIn(currency);

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [count, setCount] = useState(12);
  const [startChoice, setStartChoice] = useState<StartChoice>("today");
  const [pickedDay, setPickedDay] = useState(addDays(today, 3));
  const [fromBank, setFromBank] = useState(false);
  const [bankReady, setBankReady] = useState(preview);
  const [overview, setOverview] = useState<PlanPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [needsKyc, setNeedsKyc] = useState(false);
  // One key for the same plan, so a double tap or a retry after a dropped connection makes one plan.
  const attempt = useRef({ signature: "", key: "" });

  const minor = toMinor(amount);
  const startDate =
    startChoice === "today"
      ? today
      : startChoice === "tomorrow"
        ? addDays(today, 1)
        : startChoice === "week"
          ? addDays(today, 7)
          : pickedDay;
  const total = (BigInt(minor) * BigInt(count)).toString();
  const input: PlanInput = {
    name: name.trim(),
    amount: minor,
    frequency,
    totalDebits: count,
    startDate,
    topupFromBank: fromBank,
  };

  useEffect(() => {
    if (preview || step !== "review") return;
    let live = true;
    (async () => {
      const result = await loadMandate();
      if (live && result.ok) setBankReady(result.data?.status === "active");
    })();
    return () => {
      live = false;
    };
  }, [preview, step]);

  if (lock) return <FlowLocked lock={lock} title="Start a plan" path="/save/new" />;

  function problem(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    if (failure.kind === "refused" && failure.code === "kyc_required") setNeedsKyc(true);
    setError(failure.message);
  }

  async function toReview() {
    setError(undefined);
    setBusy(true);
    const result = await gateway.preview(input);
    setBusy(false);
    if (!result.ok) return problem(result.failure);
    setOverview(result.data);
    setStep("review");
  }

  async function start() {
    setError(undefined);
    setNeedsKyc(false);
    setBusy(true);
    const signature = JSON.stringify(input);
    if (attempt.current.signature !== signature)
      attempt.current = { signature, key: newAttemptKey() };
    const result = await gateway.create(input, attempt.current.key);
    if (!result.ok) {
      setBusy(false);
      return problem(result.failure);
    }
    router.push(`${href(`/save/${result.data.id}`)}${preview ? "&" : "?"}new=1`);
  }

  const back: Partial<Record<Step, Step>> = { amount: "name", rhythm: "amount", review: "rhythm" };
  const title: Record<Step, string> = {
    name: "What are you saving for?",
    amount: "How much each time?",
    rhythm: "How often, and how many times?",
    review: "Look it over",
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/save" />}
      <ScreenHeader
        title={title[step]}
        onBack={back[step] ? () => (setError(undefined), setStep(back[step]!)) : undefined}
        backHref={back[step] ? undefined : href("/save")}
      />

      {step !== "name" && (
        <div className="mb-6 flex items-center gap-4 rounded-[var(--radius-l)] bg-oro-tint p-4 text-oro-ink">
          <Pot ratio={step === "amount" ? 0.25 : 1} tone="active" size={56} label="Your pot" />
          <p className="grid gap-0.5 text-[14px] leading-5">
            <span className="font-semibold">{name.trim() || "Your plan"}</span>
            {BigInt(minor) > 0n && step !== "amount" ? (
              <span>
                The pot will hold{" "}
                <Amount amount={total} currency={currency} locale={locale} size="s" tone="oro" />
              </span>
            ) : (
              <span>Let&apos;s size the pot.</span>
            )}
          </p>
        </div>
      )}

      {step === "name" && (
        <div className="grid gap-6">
          <TextField
            label="Name your plan"
            value={name}
            onChange={setName}
            maxLength={60}
            autoComplete="off"
            hint="Anything you'll recognise."
          />
          <ChoiceChips
            label="Ideas"
            options={IDEAS.map((i) => ({ value: i, label: i }))}
            value={IDEAS.includes(name) ? name : null}
            onChange={setName}
          />
          <Button
            size="lg"
            block
            disabled={name.trim().length === 0}
            onClick={() => setStep("amount")}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "amount" && (
        <div className="grid gap-6">
          <AmountPad
            value={amount}
            onChange={setAmount}
            currency={currency}
            locale={locale}
            label="Each time"
            quick={QUICK_AMOUNTS[country as "NG" | "GB"] ?? []}
          />
          <Button size="lg" block disabled={minor === "0"} onClick={() => setStep("rhythm")}>
            Continue
          </Button>
        </div>
      )}

      {step === "rhythm" && (
        <div className="grid gap-6">
          <ChoiceChips
            label="How often"
            options={FREQUENCIES}
            value={frequency}
            onChange={(value) => {
              const next = value as Frequency;
              setFrequency(next);
              setCount((c) => Math.min(Math.max(c, 2), MAX_DEBITS[next]));
            }}
          />
          <div className="grid gap-3">
            <p className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">
              How many times
            </p>
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-l)] bg-surface-sunken p-3">
              <Button
                variant="quiet"
                aria-label="Fewer times"
                disabled={count <= 2}
                onClick={() => setCount((c) => Math.max(2, c - 1))}
              >
                −
              </Button>
              <p
                className="text-center font-display text-[28px] leading-8 font-bold"
                aria-live="polite"
              >
                {count} <span className="text-[15px] font-medium text-ink-muted">times</span>
              </p>
              <Button
                variant="quiet"
                aria-label="More times"
                disabled={count >= MAX_DEBITS[frequency]}
                onClick={() => setCount((c) => Math.min(MAX_DEBITS[frequency], c + 1))}
              >
                +
              </Button>
            </div>
            <ChoiceChips
              label="Usual lengths"
              hideLabel
              options={COUNTS[frequency].map((n) => ({ value: String(n), label: String(n) }))}
              value={String(count)}
              onChange={(v) => setCount(Number(v))}
            />
          </div>
          <div className="grid gap-3">
            <ChoiceChips
              label="First debit"
              options={START_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
              value={startChoice}
              onChange={(v) => setStartChoice(v as StartChoice)}
            />
            {startChoice === "pick" && (
              <label className="grid gap-2">
                <span className="text-[13px] font-semibold text-ink-muted">Choose the day</span>
                <input
                  type="date"
                  value={pickedDay}
                  min={today}
                  max={addDays(today, 90)}
                  onChange={(e) => setPickedDay(e.target.value)}
                  className="min-h-14 w-full rounded-m border-[1.5px] border-transparent bg-surface-sunken px-4 text-base text-ink focus:border-primary focus:outline-none"
                />
              </label>
            )}
          </div>
          <p className="text-[14px] text-ink-muted">
            That&apos;s <Amount amount={minor} currency={currency} locale={locale} size="s" />{" "}
            {FREQUENCY_WORD[frequency]}, {count} times, from {dayText(startDate)}.
          </p>
          {error && (
            <p role="alert" className="text-center text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          <Button size="lg" block disabled={busy} onClick={() => void toReview()}>
            {busy ? "One moment…" : "Continue"}
          </Button>
        </div>
      )}

      {step === "review" && overview && (
        <div className="grid gap-6">
          <Receipt
            title="Your plan"
            rows={[
              { label: "Saving for", value: name.trim() },
              {
                label: "Each time",
                value: <Amount amount={minor} currency={currency} locale={locale} size="s" />,
              },
              { label: "How often", value: FREQUENCY_WORD[frequency] },
              { label: "Times", value: String(count) },
              { label: "First debit", value: longDayText(overview.dates[0]!) },
              { label: "Last debit", value: longDayText(overview.endDate) },
            ]}
            total={{
              label: "The pot will hold",
              value: <Amount {...overview.total} locale={locale} size="m" />,
            }}
            stamp={preview ? "Preview" : undefined}
          />
          <section aria-label="Your debit days" className="grid gap-3">
            <p className="text-[13px] font-semibold text-ink-muted">Each bead is a debit day</p>
            <Beads
              debits={overview.dates.map((dueOn, i) => ({
                seq: i + 1,
                dueOn,
                status: "scheduled" as const,
              }))}
            />
          </section>
          <p className="text-[15px] leading-6">
            Each time, <Amount amount={minor} currency={currency} locale={locale} size="s" /> is
            taken from your wallet at 8am. Keep enough in it on those days.
          </p>
          {bankReady ? (
            <label className="flex items-start gap-3 text-[15px] leading-6">
              <input
                type="checkbox"
                checked={fromBank}
                onChange={(e) => setFromBank(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
              />
              <span>
                Top up from my bank if my wallet is short
                <span className="block text-[13px] leading-5 text-ink-muted">
                  Uses your auto-debit. It can&apos;t be cancelled while this plan is going.
                </span>
              </span>
            </label>
          ) : (
            <p className="text-[14px] leading-5 text-ink-muted">
              Want us to top up from your bank when your wallet is short?{" "}
              <Link
                href="/wallet/mandate"
                className="font-semibold text-primary underline underline-offset-4"
              >
                Set up auto-debit
              </Link>
              .
            </p>
          )}
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
          <Button size="lg" block variant="money" disabled={busy} onClick={() => void start()}>
            {busy ? "Starting…" : "Start my plan"}
          </Button>
        </div>
      )}
    </main>
  );
}
