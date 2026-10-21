"use client";

import { Building2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormPage } from "@/components/desk/FormPage";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { TextField } from "@/components/ui/TextField";
import {
  loadBanks,
  loadPayoutAccount,
  savePayoutAccount,
  type Bank,
  type Failure,
  type PayoutAccount,
} from "@/lib/payments-client";
import { FlowLocked } from "./FlowLocked";
import { useMoneyFlow } from "./MoneyFlow";

const NEW_CODE = "Each code works once, so wait for a new one in your app.";

const SAMPLE: PayoutAccount = {
  bankCode: "000",
  bankName: "Sample Bank",
  last4: "1234",
  accountName: "Your name",
};

/**
 * Where withdrawals go. Money only ever leaves for one bank account in the person's own name, and
 * changing it needs a fresh authenticator code, so a stolen password alone cannot redirect it.
 */
export function BankAccounts() {
  const { me, preview, lock } = useMoneyFlow();
  const router = useRouter();
  const [account, setAccount] = useState<PayoutAccount | null | undefined>(
    preview ? SAMPLE : undefined,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const closed = lock("withdraw");

  useEffect(() => {
    if (preview || closed || !me.mfaEnabled) return;
    let live = true;
    (async () => {
      const result = await loadPayoutAccount();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setLoadFailed(true);
      }
      setAccount(result.data);
    })();
    return () => {
      live = false;
    };
  }, [preview, closed, me.mfaEnabled, router, attempt]);

  if (closed) return <FlowLocked lock={closed} title="Bank accounts" path="/wallet/bank" />;

  return (
    <FormPage wide>
      {preview && <PreviewRibbon exitHref="/wallet/bank" />}
      <ScreenHeader
        title="Bank accounts"
        subtitle="Withdrawals only go to a bank account in your own name."
        backHref="/wallet"
      />

      {!preview && !me.mfaEnabled ? (
        <div className="grid justify-items-start gap-4 rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-lift md:p-8">
          <span className="grid size-14 place-items-center rounded-full bg-oro-tint text-oro-ink">
            <ShieldAlert aria-hidden className="size-7" />
          </span>
          <h2 className="font-display text-[22px] leading-7 font-bold">Add a second lock first</h2>
          <p className="max-w-prose text-[15px] leading-6 text-ink-muted">
            Choosing where your money goes needs a code from your authenticator app, so a stolen
            password alone can&apos;t send it anywhere else.
          </p>
          <ButtonLink href="/me/security">Set up the authenticator</ButtonLink>
        </div>
      ) : loadFailed ? (
        <div className="grid justify-items-start gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your bank account. Check your connection and try again.
          </p>
          <Button
            onClick={() => {
              setLoadFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : account === undefined ? (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      ) : (
        <div className="grid gap-6">
          <section
            aria-label="Your bank account"
            className="rounded-[var(--radius-xl)] bg-surface-raised p-5 shadow-lift md:p-7"
          >
            {account ? (
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid size-14 place-items-center rounded-full bg-primary-tint text-primary">
                  <Building2 aria-hidden className="size-7" />
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="font-display text-[20px] leading-7 font-bold">{account.bankName}</p>
                  <p className="text-[15px] text-ink-muted">
                    {account.accountName} · ending {account.last4}
                  </p>
                  <p className="text-[13px] text-ink-muted">Withdrawals go here.</p>
                </div>
                {!preview && !editing && (
                  <Button variant="quiet" onClick={() => setEditing(true)}>
                    Change account
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid justify-items-start gap-3">
                <p className="font-display text-[20px] leading-7 font-bold">No bank account yet</p>
                <p className="text-[15px] text-ink-muted">
                  Add the account you want withdrawals to go to. It must be in your own name.
                </p>
                {!editing && (
                  <Button onClick={() => setEditing(true)}>Add your bank account</Button>
                )}
              </div>
            )}
          </section>

          {editing && !preview && (
            <AccountForm
              onSaved={(saved) => {
                setAccount(saved);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          )}
        </div>
      )}
    </FormPage>
  );
}

function AccountForm({
  onSaved,
  onCancel,
}: Readonly<{ onSaved: (account: PayoutAccount) => void; onCancel: () => void }>) {
  const router = useRouter();
  const [banks, setBanks] = useState<readonly Bank[]>();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function problem(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    setError(
      failure.kind === "refused" && failure.code === "mfa_code_wrong"
        ? `${failure.message} ${NEW_CODE}`
        : failure.message,
    );
  }

  useEffect(() => {
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
  }, []);

  async function save() {
    setBusy(true);
    setError(undefined);
    const result = await savePayoutAccount({ bankCode, accountNumber, code });
    setBusy(false);
    if (!result.ok) {
      setCode("");
      return problem(result.failure);
    }
    onSaved(result.data);
  }

  return (
    <form
      aria-label="Bank account details"
      className="grid gap-5 rounded-[var(--radius-xl)] bg-surface-raised p-5 shadow-lift md:grid-cols-2 md:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
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
      <TextField
        label="Authenticator code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(value) => setCode(value.replace(/\D/g, ""))}
        hint="The 6-digit code from your authenticator app."
      />
      {error && (
        <p role="alert" className="text-[15px] font-medium text-danger md:col-span-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <Button
          type="submit"
          size="lg"
          loading={busy}
          disabled={busy || !bankCode || accountNumber.length !== 10 || code.length !== 6}
        >
          {busy ? "One moment…" : "Save this account"}
        </Button>
        <Button type="button" size="lg" variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
