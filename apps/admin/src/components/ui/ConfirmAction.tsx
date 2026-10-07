"use client";

import { X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { Failure } from "@/lib/admin-client";

type Props = Readonly<{
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** Ask for a written reason (kept in the audit log). */
  reason?: boolean;
  /** Anything the action itself needs (a choice, say), drawn above the reason. */
  children?: ReactNode;
  /** Whether the choices in `children` are complete. */
  ready?: boolean;
  /** Do it. Return null on success (the dialog closes) or why it failed (it stays, with the words). */
  onConfirm: (input: { code: string; reason: string }) => Promise<Failure | null>;
  onClose: () => void;
}>;

const REASON_MIN = 5;
const REASON_MAX = 300;

/**
 * Every sensitive action asks the same two things: why, in a sentence, and a fresh code from the
 * authenticator app. Nothing is sent until both are filled in, and the words of a refusal are shown.
 */
export function ConfirmAction({
  title,
  description,
  confirmLabel,
  danger = false,
  reason: askReason = true,
  children,
  ready = true,
  onConfirm,
  onClose,
}: Props) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const form = useRef<HTMLFormElement>(null);
  // The latest close handler, so the keyboard listener below is set up once and not on every render.
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });
  const valid =
    ready &&
    /^\d{6}$/.test(code) &&
    (!askReason || (reason.trim().length >= REASON_MIN && reason.length <= REASON_MAX));

  // Focus the first thing to fill in, once, when the dialog opens (never again while typing).
  useEffect(() => {
    form.current?.querySelector<HTMLElement>("input:not([type=radio]), textarea")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function submit() {
    setError(undefined);
    setBusy(true);
    const failure = await onConfirm({ code, reason: reason.trim() });
    setBusy(false);
    if (failure) {
      setError(failure.message);
      setCode("");
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <form
        ref={form}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !busy) void submit();
        }}
        className="relative grid w-full max-w-md gap-4 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-title`} className="font-display text-[20px] leading-7 font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sunken"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        {description && <div className="text-[14px] leading-5 text-ink-muted">{description}</div>}
        {children}
        {askReason && (
          <label className="grid gap-1.5 text-[14px] font-medium">
            Reason (kept in the audit log)
            <textarea
              value={reason}
              maxLength={REASON_MAX}
              rows={3}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-m border border-line-strong bg-surface p-3 text-[15px] font-normal"
            />
          </label>
        )}
        <label className="grid gap-1.5 text-[14px] font-medium">
          Code from your authenticator app
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="min-h-11 rounded-m border border-line-strong bg-surface px-3 text-[17px] font-normal tracking-[0.3em] tabular-nums"
          />
          <span className="text-[12px] font-normal text-ink-muted">
            A code works once. If it was just used to sign in, wait for the next one.
          </span>
        </label>
        {error && (
          <p role="alert" className="text-[14px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={danger ? "danger" : "primary"}
            loading={busy}
            disabled={busy || !valid}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
