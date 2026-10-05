"use client";

import { BadgeCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { namesMatch, validateAccount } from "@/lib/kyc-config";
import type { StepProps } from "./types";

/** The account money goes back to. Its holder's name must be the person's own. */
export function BankStep({ country, config, holder, submit, resolveName }: StepProps) {
  const [bank, setBank] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [number, setNumber] = useState("");
  const [owner, setOwner] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const ready = validateAccount(country, { bank, sortCode, number });
  const matches = owner !== undefined && namesMatch(owner, holder);

  async function lookUp() {
    setError(undefined);
    setBusy(true);
    setOwner(await resolveName(number));
    setBusy(false);
  }
  async function confirm() {
    setError(undefined);
    setBusy(true);
    const outcome = await submit({ number });
    setBusy(false);
    if (!outcome.ok) setError(outcome.message);
  }

  return (
    <div className="grid gap-6">
      {config.bank.kind === "ng" ? (
        <label className="grid gap-2">
          <span className="text-[13px] font-semibold tracking-[0.01em] text-ink-muted">Bank</span>
          <select
            value={bank}
            onChange={(e) => {
              setBank(e.target.value);
              setOwner(undefined);
            }}
            className="min-h-14 w-full rounded-m border-[1.5px] border-transparent bg-surface-sunken px-4 text-base text-ink focus:border-primary focus:bg-surface-raised focus:outline-none"
          >
            <option value="">Choose your bank</option>
            {config.bank.banks.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <TextField
          label="Sort code"
          value={sortCode}
          onChange={(value) => {
            setSortCode(value);
            setOwner(undefined);
          }}
          placeholder="12-34-56"
          inputMode="numeric"
          autoComplete="off"
        />
      )}
      <TextField
        label="Account number"
        value={number}
        onChange={(value) => {
          setNumber(value);
          setOwner(undefined);
        }}
        hint={config.bank.kind === "ng" ? "10 digits" : "8 digits"}
        inputMode="numeric"
        autoComplete="off"
      />
      {owner !== undefined && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-[var(--radius-l)] p-4 ${matches ? "bg-leaf-tint text-leaf" : "bg-danger-tint text-ink"}`}
        >
          {matches ? (
            <BadgeCheck aria-hidden className="mt-0.5 size-6 shrink-0" />
          ) : (
            <TriangleAlert aria-hidden className="mt-0.5 size-6 shrink-0 text-danger" />
          )}
          <div className="grid gap-1 text-[15px] leading-6">
            <p className="font-display text-[19px] leading-6 font-semibold">{owner}</p>
            <p>
              {matches
                ? "This is your name, so it matches your ID."
                : "That name doesn't match your ID. Use an account in your own name."}
            </p>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
      {owner === undefined ? (
        <Button
          size="lg"
          block
          loading={busy}
          disabled={!ready || busy}
          onClick={() => void lookUp()}
        >
          {busy ? "Looking it up…" : "Check the name"}
        </Button>
      ) : matches ? (
        <Button size="lg" block loading={busy} disabled={busy} onClick={() => void confirm()}>
          {busy ? "Saving…" : "Use this account"}
        </Button>
      ) : (
        <Button size="lg" block variant="quiet" onClick={() => setOwner(undefined)}>
          Use a different account
        </Button>
      )}
    </div>
  );
}
