"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = Readonly<{ codes: readonly string[] }>;

const FILE = "ajo-recovery-codes.txt";

export function recoveryFile(codes: readonly string[]): string {
  return [
    "Àjọ recovery codes",
    "Each code works once, in place of the code from your authenticator app.",
    "Keep this file somewhere only you can open it.",
    "",
    ...codes,
    "",
  ].join("\n");
}

/** The ten spare keys on a tear-off ticket: shown once, with ways to keep them safe. */
export function RecoveryTicket({ codes }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copying can be blocked; the codes are on screen and downloadable.
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="relative rounded-[var(--radius-l)] bg-oro-tint p-5">
        {/* The perforation: a dashed tear line with a notch cut into each side. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 top-14 border-t-[1.5px] border-dashed border-oro-ink/30"
        />
        <span
          aria-hidden
          className="absolute top-[3.1rem] -left-2.5 size-5 rounded-full bg-surface"
        />
        <span
          aria-hidden
          className="absolute top-[3.1rem] -right-2.5 size-5 rounded-full bg-surface"
        />
        <p className="pb-6 text-[11px] font-semibold tracking-[0.08em] text-oro-ink">
          10 SPARE KEYS · ONE USE EACH
        </p>
        <ol aria-label="Recovery codes" className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3">
          {codes.map((code, i) => (
            <li
              key={code}
              className="pop-in flex items-baseline gap-2 font-mono text-[15px] text-ink"
              style={{ "--pop-delay": `${i * 60}ms` } as React.CSSProperties}
            >
              <span aria-hidden className="w-4 text-[11px] text-oro-ink/70 tabular-nums">
                {i + 1}
              </span>
              {code}
            </li>
          ))}
        </ol>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="quiet" size="lg" onClick={() => void copyAll()}>
          {copied ? (
            <Check aria-hidden className="size-5" />
          ) : (
            <Copy aria-hidden className="size-5" />
          )}
          {copied ? "Copied" : "Copy all"}
        </Button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(recoveryFile(codes))}`}
          download={FILE}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-m bg-transparent px-6 text-base font-semibold text-primary shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-primary-tint"
        >
          <Download aria-hidden className="size-5" />
          Download
        </a>
      </div>
    </div>
  );
}
