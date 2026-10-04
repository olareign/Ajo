"use client";

import { CalendarClock, Coins, PauseCircle, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { AmountPad } from "@/components/ui/AmountPad";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PinPad } from "@/components/ui/PinPad";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import { formatMoney } from "@/lib/money-format";
import { QUICK_AMOUNTS, toMinor } from "@/lib/money-flow";
import { newAttemptKey } from "@/lib/payments-client";
import { dayText, FREQUENCY_WORD, longDayText } from "@/lib/schedule";
import type { Failure, Outcome } from "@/lib/api-send";
import type { PlanDetail } from "@/lib/savings-client";
import { loadWallets } from "@/lib/wallet-client";
import { Beads } from "./Beads";
import { Pot } from "./Pot";
import { ratioOf, StatusWord, toneOf } from "./SavingsHome";
import { useSavings, useSavingsLock } from "./SavingsFlow";

type Panel = "topup" | "end" | null;

const HISTORY_WORDS: Record<string, string> = {
  savings_debit: "Debit from your wallet",
  savings_topup: "Top-up",
  savings_maturity: "Paid out to your wallet",
  savings_early_withdrawal: "Ended early, back to your wallet",
};

/** One plan: its pot, what is coming, the days as beads, and what the person can do about it. */
export function PlanScreen({ id }: Readonly<{ id: string }>) {
  const { preview, href, locale, country } = useMoneyFlow();
  const gateway = useSavings();
  const router = useRouter();
  const lock = useSavingsLock();
  const fresh = useSearchParams().get("new") === "1";

  const [plan, setPlan] = useState<PlanDetail | "failed" | "missing">();
  const [wallet, setWallet] = useState<bigint | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [drop, setDrop] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const topKey = useRef({ signature: "", key: "" });

  // Calls go one after another: the session's refresh token is single-use.
  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.get(id);
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setPlan(
          result.failure.kind === "refused" && result.failure.status === 404 ? "missing" : "failed",
        );
      }
      setPlan(result.data);
      if (gateway.sampleWallet !== undefined) return setWallet(BigInt(gateway.sampleWallet));
      const wallets = await loadWallets();
      if (!live) return;
      if (wallets.status === "ok") {
        const mine = wallets.data.find((w) => w.currency === result.data.amount.currency);
        setWallet(BigInt(mine?.available.amount ?? "0"));
      }
    })();
    return () => {
      live = false;
    };
  }, [gateway, id, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Your plan" path={`/save/${id}`} />;

  if (plan === undefined) {
    return (
      <p role="status" className="mx-auto max-w-md px-4 pt-10 text-ink-muted">
        Loading…
      </p>
    );
  }
  if (plan === "missing") {
    return (
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-10">
        <p role="alert" className="text-ink-muted">
          We couldn&apos;t find that plan.
        </p>
        <ButtonLink href={href("/save")}>Back to my savings</ButtonLink>
      </main>
    );
  }
  if (plan === "failed") {
    return (
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-10">
        <p role="alert" className="text-ink-muted">
          We couldn&apos;t load this plan. Check your connection and try again.
        </p>
        <Button
          onClick={() => {
            setPlan(undefined);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </main>
    );
  }

  const open = plan.status === "active" || plan.status === "paused";
  const currency = plan.amount.currency;
  const perDebit = BigInt(plan.amount.amount);
  const covers = wallet !== undefined && wallet >= perDebit;

  function fail(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    setError(failure.message);
  }
  async function run(action: () => Promise<Outcome<PlanDetail>>, after?: () => void) {
    setError(undefined);
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) return fail(result.failure);
    const was = BigInt((plan as PlanDetail).saved.amount);
    setPlan(result.data);
    if (BigInt(result.data.saved.amount) > was) setDrop((n) => n + 1);
    after?.();
    if (gateway.sampleWallet !== undefined) setWallet(BigInt(gateway.sampleWallet));
  }

  const topMinor = toMinor(amount);
  const penaltyBps = plan.earlyWithdrawalPenaltyBps;
  const saved = BigInt(plan.saved.amount);
  const penalty = (saved * BigInt(penaltyBps)) / 10_000n;
  const remaining = plan.schedule.filter((d) => d.status === "scheduled").length;
  const sampleNote = preview ? " (sample)" : "";

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/save" />}
      <ScreenHeader title={plan.name} backHref={href("/save")} />

      {fresh && (
        <p
          role="status"
          className="mb-6 flex items-center gap-3 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] leading-6 text-leaf"
        >
          <Sparkles aria-hidden className="size-5 shrink-0" />
          Your pot is ready. The first debit is on {longDayText(plan.schedule[0]!.dueOn)}.
        </p>
      )}

      <section
        aria-label="Your pot"
        className="grid justify-items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift"
      >
        <Pot
          ratio={ratioOf(plan)}
          tone={toneOf(plan)}
          size={168}
          dropKey={drop === 0 ? undefined : drop}
        />
        <div className="grid gap-1">
          <Amount {...plan.saved} locale={locale} size="xl" />
          <p className="text-[14px] text-ink-muted">
            of <Amount {...plan.target} locale={locale} size="s" tone="muted" /> · {plan.paidDebits}{" "}
            of {plan.totalDebits} debits
          </p>
        </div>
        <StatusWord status={plan.status} />
      </section>

      {plan.failedDebits > 0 && (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-l)] bg-danger-tint p-4 text-[15px] leading-6 text-danger"
        >
          {plan.failedDebits} {plan.failedDebits === 1 ? "debit was" : "debits were"} missed because
          your wallet was short.{" "}
          <Link href={href("/wallet/add")} className="font-semibold underline underline-offset-4">
            Add money
          </Link>{" "}
          so the next ones go through.
        </p>
      )}

      {plan.status === "completed" && plan.payout && (
        <p
          role="status"
          className="mt-4 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] leading-6 text-leaf"
        >
          Done. <Amount {...plan.payout} locale={locale} size="s" /> is in your wallet. Keep it
          there, or withdraw it to your bank.
        </p>
      )}
      {plan.status === "cancelled" && (
        <p
          role="status"
          className="mt-4 rounded-[var(--radius-l)] bg-surface-sunken p-4 text-[15px] leading-6"
        >
          You ended this plan early.{" "}
          {plan.payout && (
            <>
              <Amount {...plan.payout} locale={locale} size="s" /> went back to your wallet
            </>
          )}
          {BigInt(plan.penalty.amount) > 0n && (
            <>
              , after a <Amount {...plan.penalty} locale={locale} size="s" /> charge
            </>
          )}
          .
        </p>
      )}

      {open && plan.nextDebit && (
        <section
          aria-label="Next debit"
          className="mt-4 grid gap-2 rounded-[var(--radius-l)] bg-primary-tint p-4"
        >
          <p className="flex items-center gap-2 text-[13px] font-semibold text-tertiary">
            <CalendarClock aria-hidden className="size-4" />
            {plan.status === "paused" ? "PAUSED, NEXT WAS" : "NEXT DEBIT"}
          </p>
          <p className="text-[17px] leading-6">
            <span className="font-semibold">{dayText(plan.nextDebit.dueOn)}</span> ·{" "}
            <Amount {...plan.nextDebit.amount} locale={locale} size="s" />
          </p>
          {wallet !== undefined && plan.status === "active" && (
            <p
              className={
                covers ? "text-[14px] text-ink-muted" : "text-[14px] font-medium text-danger"
              }
            >
              {covers
                ? `Your wallet has ${formatMoney({ amount: wallet.toString(), currency }, locale)}${sampleNote}, enough for it.`
                : `Your wallet has ${formatMoney({ amount: wallet.toString(), currency }, locale)}${sampleNote}, not enough yet.`}{" "}
              {!covers && (
                <Link href={href("/wallet/add")} className="underline underline-offset-4">
                  Add money
                </Link>
              )}
            </p>
          )}
          {plan.topupFromBank && (
            <p className="text-[13px] text-ink-muted">
              We&apos;ll top up from your bank if your wallet is short.
            </p>
          )}
        </section>
      )}

      <section aria-label="Debit days" className="mt-6 grid gap-3">
        <h2 className="font-display text-[20px] leading-7 font-semibold">
          {FREQUENCY_WORD[plan.frequency][0]!.toUpperCase() +
            FREQUENCY_WORD[plan.frequency].slice(1)}
        </h2>
        <Beads debits={plan.schedule} />
        <p className="text-[13px] text-ink-muted">
          {dayText(plan.startDate)} to {dayText(plan.endDate)}
        </p>
      </section>

      {error && (
        <p role="alert" className="mt-4 text-center text-[15px] font-medium text-danger">
          {error}
        </p>
      )}

      {open && (
        <section aria-label="What you can do" className="mt-6 grid gap-3">
          {panel === null && (
            <>
              <Button
                variant="money"
                size="lg"
                block
                onClick={() => (setError(undefined), setPanel("topup"))}
              >
                <Coins aria-hidden className="size-5" />
                Add to this pot now
              </Button>
              {plan.status === "active" ? (
                <Button
                  variant="quiet"
                  block
                  disabled={busy}
                  onClick={() => void run(() => gateway.pause(plan.id))}
                >
                  <PauseCircle aria-hidden className="size-5" />
                  Pause the plan
                </Button>
              ) : (
                <Button
                  variant="quiet"
                  block
                  disabled={busy}
                  onClick={() => void run(() => gateway.resume(plan.id))}
                >
                  <PlayCircle aria-hidden className="size-5" />
                  Start it again
                </Button>
              )}
              {preview && plan.status === "active" && (
                <Button
                  variant="quiet"
                  block
                  disabled={busy}
                  onClick={() => void run(() => gateway.takeNextDebit!(plan.id))}
                >
                  Preview: take the next debit
                </Button>
              )}
              <Button variant="danger" block onClick={() => (setError(undefined), setPanel("end"))}>
                End the plan early
              </Button>
            </>
          )}

          {panel === "topup" && (
            <div className="grid gap-5 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift">
              <AmountPad
                value={amount}
                onChange={setAmount}
                currency={currency}
                locale={locale}
                label="Add to the pot"
                quick={QUICK_AMOUNTS[country as "NG" | "GB"] ?? []}
              />
              <p className="text-center text-[13px] text-ink-muted">
                Comes from your wallet
                {wallet !== undefined && (
                  <>
                    {" "}
                    ({formatMoney({ amount: wallet.toString(), currency }, locale)}
                    {sampleNote})
                  </>
                )}
                .
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Button variant="quiet" onClick={() => (setAmount(""), setPanel(null))}>
                  Cancel
                </Button>
                <Button
                  variant="money"
                  disabled={topMinor === "0" || busy}
                  onClick={() => {
                    const signature = `${plan.id}:${topMinor}`;
                    if (topKey.current.signature !== signature)
                      topKey.current = { signature, key: newAttemptKey() };
                    void run(
                      () => gateway.topUp(plan.id, topMinor, topKey.current.key),
                      () => (setAmount(""), setPanel(null)),
                    );
                  }}
                >
                  {busy ? "Adding…" : "Add it"}
                </Button>
              </div>
            </div>
          )}

          {panel === "end" && (
            <div className="grid gap-5 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4">
              <p className="text-[15px] leading-[22px]">
                <Amount
                  amount={(saved - penalty).toString()}
                  currency={currency}
                  locale={locale}
                  size="s"
                />{" "}
                goes back to your wallet now
                {penalty > 0n && (
                  <>
                    , after a{" "}
                    <Amount
                      amount={penalty.toString()}
                      currency={currency}
                      locale={locale}
                      size="s"
                    />{" "}
                    charge for ending early
                  </>
                )}
                . The {remaining} {remaining === 1 ? "debit" : "debits"} still to come will be
                cancelled.
              </p>
              <PinPad label="Your PIN, to be sure" value={pin} onChange={setPin} />
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Button variant="quiet" onClick={() => (setPin(""), setPanel(null))}>
                  Keep the plan
                </Button>
                <Button
                  variant="danger"
                  disabled={pin.length !== 6 || busy}
                  onClick={() =>
                    void run(
                      () => gateway.endEarly(plan.id, pin),
                      () => (setPin(""), setPanel(null)),
                    ).then(() => setPin(""))
                  }
                >
                  {busy ? "One moment…" : "End it"}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {plan.history.length > 0 && (
        <section aria-label="History" className="mt-8 grid gap-3">
          <h2 className="font-display text-[20px] leading-7 font-semibold">History</h2>
          <ul className="grid gap-2">
            {plan.history.map((item, i) => (
              <li
                key={`${item.createdAt}-${i}`}
                className="flex items-center justify-between gap-3 border-b border-dashed border-line pb-2 text-[15px]"
              >
                <span>
                  {HISTORY_WORDS[item.type] ?? "Activity"}
                  <span className="block text-[13px] text-ink-muted">
                    {dayText(item.createdAt.slice(0, 10))}
                  </span>
                </span>
                <span className="text-right">
                  <span className="sr-only">
                    {item.direction === "in" ? "Into the pot" : "Out of the pot"}
                  </span>
                  <Amount {...item.amount} locale={locale} size="s" />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
