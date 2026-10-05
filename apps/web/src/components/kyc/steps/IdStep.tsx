"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { OptionCards } from "@/components/ui/OptionCards";
import { TextField } from "@/components/ui/TextField";
import { validateIdNumber } from "@/lib/kyc-config";
import type { StepProps } from "./types";

/** Choose which ID to use, then type its number: the partner confirms name and date of birth. */
export function IdStep({ country, config, submit }: StepProps) {
  const [type, setType] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const chosen = config.idTypes.find((t) => t.value === type);
  const ready = chosen !== undefined && validateIdNumber(country, chosen.value, number);

  async function send() {
    setError(undefined);
    setBusy(true);
    const outcome = await submit({ number });
    setBusy(false);
    if (!outcome.ok) setError(outcome.message);
  }

  return (
    <div className="grid gap-6">
      <OptionCards
        label="ID type"
        options={config.idTypes}
        value={type}
        onChange={(value) => {
          setType(value);
          setNumber("");
          setError(undefined);
        }}
      />
      {chosen && (
        <TextField
          label={chosen.label}
          value={number}
          onChange={setNumber}
          hint={chosen.hint}
          error={error}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode={chosen.pattern.source.startsWith("^\\d") ? "numeric" : "text"}
        />
      )}
      <Button size="lg" block loading={busy} disabled={!ready || busy} onClick={() => void send()}>
        {busy ? "Checking…" : "Check my ID"}
      </Button>
    </div>
  );
}
