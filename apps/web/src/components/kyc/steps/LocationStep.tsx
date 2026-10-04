"use client";

import { Lock, MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { StepProps } from "./types";

/**
 * Asks for the person's area with their consent. Only the area name is kept, and the exact spot is
 * stored encrypted. In a preview the browser's location is never requested: a sample area is shown.
 */
export function LocationStep({ config, submit }: StepProps) {
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function send() {
    setError(undefined);
    setBusy(true);
    const outcome = await submit({});
    setBusy(false);
    if (!outcome.ok) setError(outcome.message);
  }

  return (
    <div className="grid gap-6">
      <div className="relative grid h-40 place-items-center overflow-hidden rounded-[var(--radius-l)] bg-primary-tint">
        <span
          aria-hidden
          className="absolute inset-0 opacity-40 [background-image:radial-gradient(var(--primary)_1px,transparent_1.5px)] [background-size:18px_18px]"
        />
        <div className="relative grid justify-items-center gap-2">
          <MapPin aria-hidden className="size-10 text-primary" strokeWidth={1.75} />
          {shared && (
            <p className="rounded-full bg-surface-raised px-4 py-1.5 font-display text-[18px] font-semibold shadow-lift">
              {config.sampleArea}
            </p>
          )}
        </div>
      </div>
      <ul className="grid gap-3 text-[15px] leading-6">
        <li className="flex gap-3">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          We use it once, to know you&apos;re in the country you said.
        </li>
        <li className="flex gap-3">
          <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          The exact spot is stored encrypted. Others only ever see an area name.
        </li>
      </ul>
      {error && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
      {shared ? (
        <Button size="lg" block disabled={busy} onClick={() => void send()}>
          {busy ? "Saving…" : "Use this area"}
        </Button>
      ) : (
        <Button size="lg" block onClick={() => setShared(true)}>
          Share my location
        </Button>
      )}
    </div>
  );
}
