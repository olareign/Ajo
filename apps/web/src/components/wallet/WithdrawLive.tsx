"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Amount } from "@/components/ui/Amount";
import { AmountPad } from "@/components/ui/AmountPad";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CodeBoxes } from "@/components/ui/CodeBoxes";
import { Keypad } from "@/components/ui/Keypad";
import { PinPad } from "@/components/ui/PinPad";
import { Receipt } from "@/components/ui/Receipt";
import { TextField } from "@/components/ui/TextField";
import { toMinor } from "@/lib/money-flow";
import {
  loadBanks,
  loadPayoutAccount,
  newAttemptKey,
  savePayoutAccount,
  startWithdrawal,
  type Bank,
  type Failure,
  type PayoutAccount,
} from "@/lib/payments-client";
import { usePayment } from "@/lib/use-payment";
import { loadWallets } from "@/lib/wallet-client";
import { useMoneyFlow } from "./MoneyFlow";
import { WithdrawTicket } from "./WithdrawTicket";

type Step = "bank" | "bank-code" | "amount" | "review" | "pin" | "code" | "sent";

const NEW_CODE = "Each code works once, so wait for a new one in your app.";

/**
 * Taking money out, for real. Each step only collects; the money is held and sent by the server,
 * which checks the PIN and the authenticator code itself. Nothing here says "sent" or "arrived"
 * until the API does.
 */
export function WithdrawLive() {
  const { me, currency, locale } = useMoneyFlow();
  const router = useRouter();
  const [loaded, setLoaded] = useState<{ balance: bigint; account: PayoutAccount | null }>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [banks, setBanks] = useState<readonly Bank[]>();
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [needsKyc, setNeedsKyc] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(!me.mfaEnabled);
  // One key for as long as it is the same withdrawal, so a repeat cannot send the money twice.
  const key = useRef({ signature: "", value: "" });
  const watched = usePayment(paymentId);

  function problem(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    setError(failure.message);
  }

  // One call after another, never together: the session's refresh token is single-use.
  useEffect(() => {
    if (needsMfa) return;
    let live = true;
    (async () => {
      const wallets = await loadWallets();
      if (!live) return;
      if (wallets.status === "signed-out") return router.replace("/sign-in");
      if (wallets.status === "failed") return setLoadFailed(true);
      const accountResult = await loadPayoutAccount();
      if (!live) return;
      if (!accountResult.ok) {
        if (accountResult.failure.kind === "signed-out") return router.replace("/sign-in");
        return setLoadFailed(true);
      }
      const wallet = wallets.data.find((w) => w.currency === currency);
      setAccount(accountResult.data);
      setLoaded({
        balance: BigInt(wallet?.available.amount ?? "0"),
        account: accountResult.data,
      });
      setStep(accountResult.data ? "amount" : "bank");
    })();
    return () => {
      live = false;
    };
  }, [needsMfa, currency, router, attempt]);

  useEffect(() => {
    if (step !== "bank" || banks) return;
    let live = true;
    (async () => {
      const result = await loadBanks();
      if (!live) return;
      if (result.ok) setBanks(result.data);
      else problem(result.failure);
    })();
    return () => {
      live = false;
    };
    // `problem` only sets state and navigates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, banks]);

  /** Where each refusal puts the person back, with the API's own words. */
  function refused(failure: Failure, here: Step) {
    setCode("");
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    if (failure.kind === "unreachable") {
      setStep(here);
      return setError(
        `${failure.message} Look at your wallet's activity before trying again, in case it went through.`,
      );
    }
    switch (failure.code) {
      case "mfa_enrolment_required":
        return setNeedsMfa(true);
      case "mfa_code_wrong":
      case "mfa_code_required":
      case "mfa_locked":
        setStep(here);
        return setError(
          failure.code === "mfa_code_wrong" ? `${failure.message} ${NEW_CODE}` : failure.message,
        );
      case "kyc_required":
        setNeedsKyc(true);
        break;
      case "insufficient_funds":
        setStep("amount");
        break;
      case "payout_account_required":
        setStep("bank");
        break;
      default:
        // No code on a 422 or 429 is the PIN being refused or locked.
        if (failure.status === 422 || failure.status === 429) {
          if (here === "code") {
            setPin("");
            setStep("pin");
          }
        } else {
          setStep(here);
        }
    }
    setError(failure.message);
  }

  async function saveAccount() {
    setBusy(true);
    setError(undefined);
    const result = await savePayoutAccount({ bankCode, accountNumber, code });
    setBusy(false);
    if (!result.ok) {
      const failure = result.failure;
      setCode("");
      if (failure.kind === "refused" && failure.code === "mfa_code_wrong") {
        return setError(`${failure.message} ${NEW_CODE}`);
      }
      if (
        failure.kind === "refused" &&
        failure.code !== "mfa_code_required" &&
        failure.code !== "mfa_locked"
      ) {
        // The account itself was refused (not found, not in the person's name): back to the form.
        setStep("bank");
        return setError(failure.message);
      }
      return refused(failure, "bank-code");
    }
    setAccount(result.data);
    setLoaded((l) => (l ? { ...l, account: result.data } : l));
    setCode("");
    setAccountNumber("");
    setStep("amount");
  }

  async function send() {
    if (!account) return;
    setBusy(true);
    setError(undefined);
    setNeedsKyc(false);
    const minor = toMinor(amount);
    const signature = `${minor}:${account.bankCode}:${account.last4}`;
    if (key.current.signature !== signature) {
      key.current = { signature, value: newAttemptKey() };
    }
    const result = await startWithdrawal({ amount: minor, pin, code, key: key.current.value });
    setBusy(false);
    if (!result.ok) return refused(result.failure, "code");
    setPin("");
    setCode("");
    setPaymentId(result.data.id);
    setStep("sent");
  }

  if (needsMfa) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
        <ScreenHeader title="Withdraw" backHref="/wallet" />
        <div className="grid justify-items-center gap-5 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift">
          <span className="grid size-20 place-items-center rounded-full bg-oro-tint text-oro-ink">
            <ShieldAlert aria-hidden className="size-10" />
          </span>
          <p className="font-display text-[22px] leading-7 font-semibold">
            Turn on the authenticator app first
          </p>
          <p className="text-[15px] leading-6 text-ink-muted">
            Taking money out needs a code from your authenticator app every time. It takes a minute
            to set up.
          </p>
          <ButtonLink href="/me/security">Set it up</ButtonLink>
        </div>
      </main>
    );
  }

  if (loadFailed) {
    return (
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-10">
        <p role="alert" className="text-ink-muted">
          We couldn&apos;t load this. Check your connection and try again.
        </p>
        <Button
          onClick={() => {
            setLoadFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </main>
    );
  }

  if (!loaded) {
    return (
      <p role="status" className="mx-auto max-w-md px-4 pt-10 text-ink-muted">
        Loading…
      </p>
    );
  }

  const minor = toMinor(amount);
  const tooMuch = BigInt(minor) > loaded.balance;
  const whole = (loaded.balance / 100n).toString();
  const errorLine = error && (
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
  );
  const status = watched.payment?.status;
  const settled = status === "succeeded" || status === "failed" || status === "reversed";
  const outcome = status === "succeeded" ? "arrived" : "reversed";

  const back: Partial<Record<Step, Step>> = {
    "bank-code": "bank",
    review: "amount",
    pin: "review",
    code: "pin",
  };
  const goBack = () => {
    const previous = back[step];
    if (!previous) return;
    setError(undefined);
    if (step === "pin") setPin("");
    setCode("");
    setStep(previous);
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title={
          step === "bank"
            ? "Where should it go?"
            : step === "bank-code"
              ? "Confirm it's you"
              : step === "amount"
                ? "Withdraw"
                : step === "review"
                  ? "Look it over"
                  : step === "pin"
                    ? "Approve it"
                    : step === "code"
                      ? "One more check"
                      : !settled
                        ? "On its way"
                        : outcome === "arrived"
                          ? "Money arrived"
                          : "Sent back"
        }
        subtitle={
          step === "bank"
            ? "Withdrawals only go to a bank account in your own name."
            : step === "bank-code" || step === "code"
              ? "Enter the 6-digit code from your authenticator app."
              : step === "pin"
                ? "Enter your 6-digit PIN."
                : undefined
        }
        onBack={back[step] ? goBack : undefined}
        backHref={back[step] ? undefined : step === "sent" ? undefined : "/wallet"}
      />

      {step === "bank" && (
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            setError(undefined);
            setStep("bank-code");
          }}
        >
          <label className="grid gap-2">
            <span className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">Bank</span>
            <select
              value={bankCode}
              onChange={(event) => setBankCode(event.target.value)}
              disabled={!banks}
              className="min-h-14 w-full rounded-m border-[1.5px] border-transparent bg-surface-sunken px-4 text-base text-ink focus:border-primary focus:bg-surface-raised focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <option value="">{banks ? "Choose your bank" : "Loading banks…"}</option>
              {banks?.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Account number"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            value={accountNumber}
            onChange={(value) => setAccountNumber(value.replace(/\D/g, ""))}
            hint="The 10-digit number your bank gave you."
          />
          {errorLine}
          <Button type="submit" size="lg" block disabled={!bankCode || accountNumber.length !== 10}>
            Continue
          </Button>
        </form>
      )}

      {(step === "bank-code" || step === "code") && (
        <div className="grid gap-6">
          <CodeBoxes label="Authenticator code" value={code} length={6} />
          {errorLine}
          <Button
            size="lg"
            block
            disabled={code.length !== 6 || busy}
            onClick={() => void (step === "code" ? send() : saveAccount())}
          >
            {busy ? "One moment…" : step === "code" ? "Send it" : "Save this account"}
          </Button>
          <Keypad value={code} onChange={setCode} length={6} label="Number pad" />
        </div>
      )}

      {step === "amount" && (
        <div className="grid gap-6">
          <p className="text-center text-[14px] text-ink-muted">
            Available{" "}
            <Amount
              amount={loaded.balance.toString()}
              currency={currency}
              locale={locale}
              size="s"
            />
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
          {!tooMuch && errorLine}
          <Button
            size="lg"
            block
            disabled={minor === "0" || tooMuch}
            onClick={() => {
              setError(undefined);
              setStep("review");
            }}
          >
            Continue
          </Button>
          {whole !== "0" && (
            <button
              type="button"
              onClick={() => setAmount(whole)}
              className="justify-self-center rounded-s px-2 py-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              Withdraw everything
            </button>
          )}
          {account && (
            <button
              type="button"
              onClick={() => {
                setError(undefined);
                setStep("bank");
              }}
              className="justify-self-center rounded-s px-2 py-2 text-[15px] font-semibold text-ink-muted underline-offset-4 hover:underline"
            >
              Change the bank account
            </button>
          )}
        </div>
      )}

      {step === "review" && account && (
        <div className="grid gap-6">
          <Receipt
            title="You're withdrawing"
            rows={[
              { label: "To", value: `${account.bankName} •••• ${account.last4}` },
              { label: "In the name of", value: account.accountName },
              { label: "Arrives", value: "Usually within minutes" },
            ]}
            total={{
              label: "You receive",
              value: <Amount amount={minor} currency={currency} locale={locale} size="m" />,
            }}
          />
          <Button size="lg" block onClick={() => setStep("pin")}>
            Continue
          </Button>
        </div>
      )}

      {step === "pin" && (
        <div className="grid gap-6">
          <PinPad label="Transaction PIN" value={pin} onChange={setPin} />
          {errorLine}
          <Button
            size="lg"
            block
            disabled={pin.length !== 6}
            onClick={() => {
              setError(undefined);
              setStep("code");
            }}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "sent" && account && (
        <div className="grid gap-6">
          <WithdrawTicket
            bank={account.bankName}
            minor={minor}
            currency={currency}
            locale={locale}
            stage={settled ? 3 : 1}
            outcome={outcome}
          />
          {watched.gaveUp && (
            <p role="status" className="text-center text-[15px] text-ink-muted">
              Your bank is taking longer than usual. This updates in your wallet by itself, and your
              money is safe in the meantime.
            </p>
          )}
          {watched.failure?.kind === "refused" && (
            <p role="alert" className="text-center text-[15px] text-danger">
              {watched.failure.message}
            </p>
          )}
          {(settled || watched.gaveUp) && (
            <ButtonLink href="/wallet" size="lg" block>
              Back to my wallet
            </ButtonLink>
          )}
        </div>
      )}
    </main>
  );
}
