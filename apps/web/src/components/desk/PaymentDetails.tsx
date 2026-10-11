"use client";

import { Check, Copy, FileText, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Amount } from "@/components/ui/Amount";
import { accountLabel, describeTransaction, type WalletTransaction } from "@/lib/wallet";

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

/**
 * One payment, picked from the list beside it on a desk: how much, what it was, which part of your
 * money it touched, when, and the reference to quote if you write to us about it.
 */
export function PaymentDetails({ item }: Readonly<{ item: WalletTransaction | undefined }>) {
  const [copied, setCopied] = useState<string>();
  if (!item) {
    return (
      <section
        aria-label="Payment details"
        className="grid justify-items-center gap-3 rounded-[var(--radius-xl)] bg-surface-raised p-8 text-center shadow-lift"
      >
        <MousePointerClick aria-hidden className="size-8 text-ink-muted" />
        <p className="text-[15px] text-ink-muted">Pick a payment to see its details.</p>
      </section>
    );
  }
  const incoming = item.direction === "in";
  return (
    <section
      aria-labelledby="payment-details"
      className="grid gap-6 rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-lift"
    >
      <h2 id="payment-details" className="font-display text-[20px] leading-7 font-bold">
        Payment details
      </h2>
      <div className="flex items-end justify-between gap-4">
        <div className="grid gap-0.5">
          <span className="text-[13px] text-ink-muted">{incoming ? "Money in" : "Money out"}</span>
          <span className="text-[17px] font-semibold">{describeTransaction(item.type)}</span>
        </div>
        <p className={incoming ? "text-leaf" : undefined}>
          {incoming && (
            <span aria-hidden className="font-display text-[22px] font-bold">
              +
            </span>
          )}
          <Amount
            amount={incoming ? item.amount.amount : `-${item.amount.amount}`}
            currency={item.amount.currency}
            size="l"
            className={incoming ? "text-leaf" : undefined}
          />
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14px]">
        <div className="grid gap-0.5">
          <dt className="text-ink-muted">Part of your money</dt>
          <dd className="font-semibold">{accountLabel(item.account)}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-ink-muted">Currency</dt>
          <dd className="font-semibold">{item.amount.currency}</dd>
        </div>
        <div className="col-span-2 grid gap-0.5">
          <dt className="text-ink-muted">When</dt>
          <dd className="font-semibold">
            <time dateTime={item.createdAt}>{when(item.createdAt)}</time>
          </dd>
        </div>
        <div className="col-span-2 grid gap-0.5">
          <dt className="text-ink-muted">Reference</dt>
          <dd className="font-mono text-[13px] break-all">{item.transactionId}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(item.transactionId)
              .then(() => setCopied(item.transactionId));
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-m bg-primary-tint px-4 text-[14px] font-semibold text-primary hover:brightness-95"
        >
          {copied === item.transactionId ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied === item.transactionId ? "Reference copied" : "Copy reference"}
        </button>
        <Link
          href="/wallet/statements"
          className="inline-flex min-h-11 items-center gap-2 rounded-m px-4 text-[14px] font-semibold text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)] hover:bg-surface-sunken"
        >
          <FileText aria-hidden className="size-4" />
          Statement
        </Link>
      </div>
    </section>
  );
}
