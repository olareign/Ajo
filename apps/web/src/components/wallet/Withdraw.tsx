"use client";

import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { AmountPad } from "@/components/ui/AmountPad";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PinPad } from "@/components/ui/PinPad";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { Receipt } from "@/components/ui/Receipt";
import { SAMPLE, toMinor, withdrawOutcome } from "@/lib/money-flow";
import { pause } from "@/lib/preview";
import { FlowLocked } from "./FlowLocked";
import { WithdrawLive } from "./WithdrawLive";
import { WithdrawTicket } from "./WithdrawTicket";
import { useMoneyFlow } from "./MoneyFlow";

type Step = "amount" | "review" | "pin" | "sent";

const STAGE_MS = 900;

/** Taking money out: how much, a look, the PIN, then a ticket that follows it to the bank. */
export function Withdraw() {
  const flow = useMoneyFlow();
  const { preview, country, currency, locale, lock } = flow;
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [stage, setStage] = useState(0);

  const balance = SAMPLE.balance[country];
  const account = SAMPLE.account[country];
  const minor = toMinor(amount);
  const outcome = withdrawOutcome(amount);
  const tooMuch = Number(amount || "0") > balance;
  const closed = lock("withdraw");

  useEffect(() => {
    if (step !== "sent" || stage >= 3) return;
    let current = true;
    (async () => {
      await pause(STAGE_MS);
      if (current) setStage((s) => s + 1);
    })();
    return () => {
      current = false;
    };
  }, [step, stage]);

  if (closed) return <FlowLocked lock={closed} title="Withdraw" path="/wallet/withdraw" />;
  if (!preview) return <WithdrawLive />;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/wallet/withdraw" />}
      <ScreenHeader
        title={
          step === "amount"
            ? "Withdraw"
            : step === "review"
              ? "Look it over"
              : step === "pin"
                ? "Approve it"
                : stage < 3
                  ? "On its way"
                  : outcome === "arrived"
                    ? "Money arrived"
                    : "Sent back"
        }
        subtitle={step === "pin" ? "Enter your 6-digit PIN to send it." : undefined}
        onBack={
          step === "review"
            ? () => setStep("amount")
            : step === "pin"
              ? () => {
                  setPin("");
                  setStep("review");
                }
              : undefined
        }
        backHref={step === "amount" ? "/wallet" : undefined}
      />

      {step === "amount" && (
        <div className="grid gap-6">
          <p className="text-center text-[14px] text-ink-muted">
            Available{" "}
            <Amount
              amount={toMinor(String(balance))}
              currency={currency}
              locale={locale}
              size="s"
            />
            {preview ? " (sample)" : ""}
          </p>
          <AmountPad
            value={amount}
            onChange={setAmount}
            currency={currency}
            locale={locale}
            label="Amount to withdraw"
          />
          {tooMuch && (
            <p role="alert" className="text-center text-[15px] font-medium text-danger">
              That&apos;s more than you have available.
            </p>
          )}
          <Button
            size="lg"
            block
            disabled={toMinor(amount) === "0" || tooMuch}
            onClick={() => setStep("review")}
          >
            Continue
          </Button>
          <button
            type="button"
            onClick={() => setAmount(String(balance))}
            className="justify-self-center rounded-s px-2 py-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            Withdraw everything
          </button>
        </div>
      )}

      {step === "review" && (
        <div className="grid gap-6">
          <Receipt
            title="You're withdrawing"
            rows={[
              { label: "To", value: `${account.bank} •••• ${account.last4}` },
              { label: "In the name of", value: flow.me.displayName.toUpperCase() },
              { label: "Arrives", value: "Usually within minutes" },
            ]}
            total={{
              label: "You receive",
              value: <Amount amount={minor} currency={currency} locale={locale} size="m" />,
            }}
            stamp={preview ? "Preview" : undefined}
          />
          <Button size="lg" block onClick={() => setStep("pin")}>
            Continue
          </Button>
        </div>
      )}

      {step === "pin" && (
        <div className="grid gap-6">
          <PinPad label="Transaction PIN" value={pin} onChange={setPin} />
          <Button
            size="lg"
            block
            disabled={pin.length !== 6}
            onClick={() => {
              setStage(0);
              setStep("sent");
            }}
          >
            Send it
          </Button>
          <p className="text-center text-[12px] leading-5 text-ink-muted">
            Any six digits work in a preview. Your real PIN is checked when this is live.
          </p>
        </div>
      )}

      {step === "sent" && (
        <div className="grid gap-6">
          <WithdrawTicket
            bank={account.bank}
            minor={minor}
            currency={currency}
            locale={locale}
            stage={stage}
            outcome={outcome}
          />
          {stage >= 3 && (
            <ButtonLink href="/wallet" size="lg" block>
              Back to my wallet
            </ButtonLink>
          )}
          {preview && stage >= 3 && (
            <p className="text-center text-[12px] leading-5 text-ink-muted">
              Tip for reviewers: an amount ending 666 shows a bank refusal that is reversed.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
