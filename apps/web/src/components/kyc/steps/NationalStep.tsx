"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { validateBvn } from "@/lib/kyc-config";
import type { StepProps } from "./types";

/** Optional, and only where a country offers one: it raises how much a person can move. */
export function NationalStep({ config, submit }: StepProps) {
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const check = config.nationalCheck;
  if (!check)
    return <p className="text-ink-muted">This extra check isn&apos;t offered in your country.</p>;

  async function send() {
    setError(undefined);
    setBusy(true);
    const outcome = await submit({ number });
    setBusy(false);
    if (!outcome.ok) setError(outcome.message);
  }

  return (
    <div className="grid gap-6">
      <div className="flex gap-3 rounded-[var(--radius-l)] bg-primary-tint p-4 text-[14px] leading-5">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          {check.detail} We only confirm it belongs to you. We never see your balance or your
          transactions.
        </p>
      </div>
      <TextField
        label={check.label}
        value={number}
        onChange={setNumber}
        hint="11 digits"
        error={error}
        inputMode="numeric"
        autoComplete="off"
      />
      <Button
        size="lg"
        block
        loading={busy}
        disabled={!validateBvn(number) || busy}
        onClick={() => void send()}
      >
        {busy ? "Checking…" : `Add my ${check.label}`}
      </Button>
    </div>
  );
}
