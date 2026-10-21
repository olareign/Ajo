"use client";

import { Building2 } from "lucide-react";
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
import { FormPage } from "@/components/desk/FormPage";

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
    <FormPage wide>
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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
            <section
              aria-labelledby="how-much"
              className="grid gap-4 rounded-[var(--radius-xl)] bg-surface-raised p-5 shadow-lift md:p-7"
            >
              <h2 id="how-much" className="font-display text-[20px] leading-7 font-bold">
                How much?
              </h2>
              <p className="text-[14px] text-ink-muted md:text-[15px]">
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
                <p role="alert" className="text-[15px] font-medium text-danger">
                  That&apos;s more than you have available.
                </p>
              )}
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="justify-self-start rounded-s py-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
              >
                Withdraw everything
              </button>
            </section>
            <section
              aria-labelledby="withdraw-to"
              className="grid gap-4 rounded-[var(--radius-xl)] bg-surface-raised p-5 shadow-lift md:p-7"
            >
              <h2 id="withdraw-to" className="font-display text-[20px] leading-7 font-bold">
                To
              </h2>
              <div className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                  <Building2 aria-hidden className="size-6" />
                </span>
                <div className="grid min-w-0 flex-1">
                  <span className="font-semibold">{account.bank}</span>
                  <span className="text-[14px] text-ink-muted">
                    {flow.me.displayName.toUpperCase()} · ending {account.last4}
                  </span>
                </div>
              </div>
            </section>
          </div>
          <div className="grid gap-3 md:flex md:items-center md:gap-6">
            <Button
              size="lg"
              className="w-full md:w-auto md:min-w-72"
              disabled={toMinor(amount) === "0" || tooMuch}
              onClick={() => setStep("review")}
            >
              Continue
            </Button>
            <p className="text-[13px] leading-5 text-ink-muted">
              Next you&apos;ll confirm with your PIN.
            </p>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="grid md:max-w-xl gap-6">
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
        <div className="grid md:max-w-xl gap-6">
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
        <div className="grid md:max-w-xl gap-6">
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
    </FormPage>
  );
}
