"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Beads } from "@/components/savings/Beads";
import { Amount } from "@/components/ui/Amount";
import { AmountPad } from "@/components/ui/AmountPad";
import { Button } from "@/components/ui/Button";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { OptionCards } from "@/components/ui/OptionCards";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { Receipt } from "@/components/ui/Receipt";
import { TextField } from "@/components/ui/TextField";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Failure } from "@/lib/api-send";
import type {
  GroupFrequency,
  GroupInput,
  GroupPreview,
  OrderMethod,
  Visibility,
} from "@/lib/groups-client";
import { toMinor } from "@/lib/money-flow";
import { newAttemptKey } from "@/lib/payments-client";
import { addDays, longDayText, todayIn } from "@/lib/schedule";
import { FREQ_WORDS, ORDER_WORDS, useCircles, useCirclesLock } from "./CirclesFlow";

type Step = "name" | "money" | "rules" | "review";

const SIZES = [4, 6, 8, 10, 12];
const FREQUENCIES: readonly { value: GroupFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];
const STARTS = [
  { value: "7", label: "In a week" },
  { value: "14", label: "In 2 weeks" },
  { value: "30", label: "In a month" },
  { value: "pick", label: "Pick a day" },
] as const;
const ORDERS: readonly { value: OrderMethod; title: string; detail: string }[] = [
  {
    value: "random",
    title: "A draw",
    detail:
      "When the circle is full, turns are drawn by lot. The draw is logged so anyone can check it was fair.",
  },
  {
    value: "pick",
    title: "Everyone picks",
    detail:
      "When it's full, everyone gets 24 hours to choose a turn. Anyone who hasn't picked is given one that's left.",
  },
  {
    value: "join_order",
    title: "In the order people join",
    detail: "First to join takes the first turn.",
  },
];

/** Starting a circle in four steps, ending with a look at the whole cycle before anything is saved. */
export function NewCircle() {
  const { preview, href, currency, locale } = useMoneyFlow();
  const gateway = useCircles();
  const router = useRouter();
  const lock = useCirclesLock();
  const today = todayIn(currency);

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [community, setCommunity] = useState("");
  const [amount, setAmount] = useState("");
  const [size, setSize] = useState(6);
  const [frequency, setFrequency] = useState<GroupFrequency>("monthly");
  const [startChoice, setStartChoice] = useState<string>("14");
  const [pickedDay, setPickedDay] = useState(addDays(today, 10));
  const [order, setOrder] = useState<OrderMethod>("random");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [overview, setOverview] = useState<GroupPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [code, setCode] = useState<string>();
  const attempt = useRef({ signature: "", key: "" });

  const minor = toMinor(amount);
  const startDate = startChoice === "pick" ? pickedDay : addDays(today, Number(startChoice));
  const input: GroupInput = {
    name: name.trim(),
    ...(community.trim() ? { community: community.trim() } : {}),
    contribution: minor,
    frequency,
    size,
    startDate,
    orderMethod: order,
    visibility,
  };
  const pot = BigInt(minor) * BigInt(size);

  if (lock) return <FlowLocked lock={lock} title="Start a circle" path="/circles/new" />;

  function problem(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    setCode(failure.kind === "refused" ? failure.code : undefined);
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
    setCode(undefined);
    setBusy(true);
    const signature = JSON.stringify(input);
    if (attempt.current.signature !== signature)
      attempt.current = { signature, key: newAttemptKey() };
    const result = await gateway.create(input, attempt.current.key);
    if (!result.ok) {
      setBusy(false);
      return problem(result.failure);
    }
    router.push(`${href(`/circles/${result.data.id}`)}${preview ? "&" : "?"}new=1`);
  }

  const back: Partial<Record<Step, Step>> = { money: "name", rules: "money", review: "rules" };
  const title: Record<Step, string> = {
    name: "Name your circle",
    money: "How much, and who with?",
    rules: "When, and in what order?",
    review: "Look it over",
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/circles" />}
      <ScreenHeader
        title={title[step]}
        onBack={back[step] ? () => (setError(undefined), setStep(back[step]!)) : undefined}
        backHref={back[step] ? undefined : href("/circles")}
      />

      {step === "name" && (
        <div className="grid gap-6">
          <TextField
            label="Circle name"
            value={name}
            onChange={setName}
            maxLength={60}
            autoComplete="off"
            hint="Something your people will recognise."
          />
          <TextField
            label="Community (optional)"
            value={community}
            onChange={setCommunity}
            maxLength={40}
            autoComplete="off"
            hint="A church, a market, an office: helps people find the right circle."
          />
          <Button
            size="lg"
            block
            disabled={name.trim().length === 0}
            onClick={() => setStep("money")}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "money" && (
        <div className="grid gap-6">
          <AmountPad
            value={amount}
            onChange={setAmount}
            currency={currency}
            locale={locale}
            label="Each person pays, each round"
          />
          <div className="grid gap-3">
            <p className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">
              How many people
            </p>
            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-l)] bg-surface-sunken p-3">
              <Button
                variant="quiet"
                aria-label="Fewer people"
                disabled={size <= 3}
                onClick={() => setSize((n) => Math.max(3, n - 1))}
              >
                −
              </Button>
              <p
                className="text-center font-display text-[28px] leading-8 font-bold"
                aria-live="polite"
              >
                {size} <span className="text-[15px] font-medium text-ink-muted">people</span>
              </p>
              <Button
                variant="quiet"
                aria-label="More people"
                disabled={size >= 30}
                onClick={() => setSize((n) => Math.min(30, n + 1))}
              >
                +
              </Button>
            </div>
            <ChoiceChips
              label="Usual sizes"
              hideLabel
              options={SIZES.map((n) => ({ value: String(n), label: String(n) }))}
              value={String(size)}
              onChange={(v) => setSize(Number(v))}
            />
          </div>
          <ChoiceChips
            label="How often"
            options={FREQUENCIES}
            value={frequency}
            onChange={(v) => setFrequency(v as GroupFrequency)}
          />
          {BigInt(minor) > 0n && (
            <p className="rounded-[var(--radius-l)] bg-oro-tint p-4 text-[15px] leading-6 text-oro-ink">
              Each turn pays out{" "}
              <Amount
                amount={pot.toString()}
                currency={currency}
                locale={locale}
                size="s"
                tone="oro"
              />
              , and every one of the {size} people takes a turn.
            </p>
          )}
          <Button size="lg" block disabled={minor === "0"} onClick={() => setStep("rules")}>
            Continue
          </Button>
        </div>
      )}

      {step === "rules" && (
        <div className="grid gap-6">
          <div className="grid gap-3">
            <ChoiceChips
              label="First round is collected"
              options={STARTS.map((s) => ({ value: s.value, label: s.label }))}
              value={startChoice}
              onChange={setStartChoice}
            />
            {startChoice === "pick" && (
              <label className="grid gap-2">
                <span className="text-[13px] font-semibold text-ink-muted">Choose the day</span>
                <input
                  type="date"
                  value={pickedDay}
                  min={addDays(today, 1)}
                  max={addDays(today, 90)}
                  onChange={(e) => setPickedDay(e.target.value)}
                  className="min-h-14 w-full rounded-m border-[1.5px] border-transparent bg-surface-sunken px-4 text-base text-ink focus:border-primary focus:outline-none"
                />
              </label>
            )}
            <p className="text-[14px] text-ink-muted">
              {longDayText(startDate)}. The circle must be full by then, or it&apos;s called off and
              nobody loses anything.
            </p>
          </div>
          <OptionCards
            label="Who takes which turn"
            options={ORDERS}
            value={order}
            onChange={(v) => setOrder(v as OrderMethod)}
          />
          <ChoiceChips
            label="Who can find it"
            options={[
              { value: "private", label: "Only people I invite" },
              { value: "public", label: "Anyone can find it" },
            ]}
            value={visibility}
            onChange={(v) => setVisibility(v as Visibility)}
          />
          {error && (
            <p role="alert" className="text-center text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          <Button size="lg" block loading={busy} disabled={busy} onClick={() => void toReview()}>
            {busy ? "One moment…" : "Continue"}
          </Button>
        </div>
      )}

      {step === "review" && overview && (
        <div className="grid gap-6">
          <Receipt
            title="Your circle"
            rows={[
              { label: "Name", value: name.trim() },
              ...(community.trim() ? [{ label: "Community", value: community.trim() }] : []),
              {
                label: "Each person pays",
                value: <Amount amount={minor} currency={currency} locale={locale} size="s" />,
              },
              { label: "How often", value: FREQ_WORDS[frequency] },
              { label: "People", value: String(size) },
              { label: "Turns", value: ORDER_WORDS[order] },
              { label: "First round", value: longDayText(overview.dates[0]!) },
              {
                label: "Last round",
                value: longDayText(overview.dates[overview.dates.length - 1]!),
              },
            ]}
            total={{
              label: "Each turn pays out",
              value: <Amount {...overview.pot} locale={locale} size="m" />,
            }}
            stamp={preview ? "Preview" : undefined}
          />
          <section aria-label="Every round" className="grid gap-3">
            <p className="text-[13px] font-semibold text-ink-muted">
              Each bead is a round, one turn each
            </p>
            <Beads
              debits={overview.dates.map((dueOn, i) => ({
                seq: i + 1,
                dueOn,
                status: "scheduled" as const,
              }))}
            />
          </section>
          <section
            aria-label="How it stays safe"
            className="grid gap-2 rounded-[var(--radius-l)] bg-primary-tint p-4 text-[14px] leading-5"
          >
            <p className="font-semibold text-tertiary">How it stays safe</p>
            <p>
              People new to circles lock a deposit of{" "}
              <Amount {...overview.deposit} locale={locale} size="s" /> until it ends, and{" "}
              <Amount {...overview.earlyDeposit} locale={locale} size="s" /> to take one of the
              first {overview.earlySpots} turns. Trusted members lock nothing.
            </p>
            <p>
              If someone doesn&apos;t pay, they get {overview.graceDays} days, then their deposit
              pays for them, so the turn still pays out in full.
            </p>
          </section>
          <p className="text-[14px] leading-5 text-ink-muted">
            You&apos;ll be the first member. Circles collect each round from your wallet, with your
            auto-debit as backup, so{" "}
            <Link
              href={href("/wallet/mandate")}
              className="font-semibold text-primary underline underline-offset-4"
            >
              set that up
            </Link>{" "}
            first if you haven&apos;t.
          </p>
          {error && (
            <p role="alert" className="text-center text-[15px] font-medium text-danger">
              {error}{" "}
              {code === "no_mandate" && (
                <Link href={href("/wallet/mandate")} className="underline underline-offset-4">
                  Set up auto-debit
                </Link>
              )}
              {code === "deposit_needed" && (
                <Link href={href("/wallet/add")} className="underline underline-offset-4">
                  Add money
                </Link>
              )}
              {code === "kyc_required" && (
                <Link href="/verify" className="underline underline-offset-4">
                  Go to my passport
                </Link>
              )}
            </p>
          )}
          <Button
            size="lg"
            block
            variant="money"
            loading={busy}
            disabled={busy}
            onClick={() => void start()}
          >
            {busy ? "Starting…" : "Start my circle"}
          </Button>
        </div>
      )}
    </main>
  );
}
