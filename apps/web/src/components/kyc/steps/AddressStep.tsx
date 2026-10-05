"use client";

import { FileText } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import type { StepProps } from "./types";

/** A recent document with the person's name and address. In a preview the file is never read or sent. */
export function AddressStep({ config, submit }: StepProps) {
  const inputId = useId();
  const [kind, setKind] = useState<string | null>(null);
  const [file, setFile] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function send() {
    setError(undefined);
    setBusy(true);
    const outcome = await submit({ file });
    setBusy(false);
    if (!outcome.ok) setError(outcome.message);
  }

  return (
    <div className="grid gap-6">
      <ChoiceChips
        label="Which document?"
        options={config.addressDocuments.map((d) => ({ value: d.value, label: d.title }))}
        value={kind}
        onChange={setKind}
      />
      <div className="grid gap-2">
        <label
          htmlFor={inputId}
          className="grid cursor-pointer justify-items-center gap-2 rounded-[var(--radius-l)] border-[1.5px] border-dashed border-line-strong bg-surface-sunken px-4 py-8 text-center focus-within:border-primary"
        >
          <FileText aria-hidden className="size-8 text-primary" />
          <span className="text-[15px] font-semibold">{file ?? "Choose a photo or PDF"}</span>
          <span className="text-[13px] text-ink-muted">
            Dated in the last 3 months, your name and address clear to read
          </span>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0]?.name)}
        />
      </div>
      {error && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
      <Button
        size="lg"
        block
        loading={busy}
        disabled={!kind || !file || busy}
        onClick={() => void send()}
      >
        {busy ? "Checking…" : "Send document"}
      </Button>
    </div>
  );
}
