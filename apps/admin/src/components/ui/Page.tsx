import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { Failure } from "@/lib/admin-client";

export function PageHeader({
  title,
  subtitle,
  action,
}: Readonly<{ title: string; subtitle?: string; action?: ReactNode }>) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="font-display text-[26px] leading-8 font-bold tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Loading() {
  return (
    <p role="status" className="flex items-center gap-2 text-ink-muted">
      <Spinner />
      Loading…
    </p>
  );
}

export function Failed({ failure, retry }: Readonly<{ failure: Failure; retry: () => void }>) {
  return (
    <div
      role="alert"
      className="grid justify-items-start gap-3 rounded-[var(--radius-l)] bg-danger-tint p-4"
    >
      <p className="flex items-center gap-2 text-[15px] font-medium text-danger">
        <TriangleAlert aria-hidden className="size-5" />
        {failure.message}
      </p>
      {failure.status !== 403 && (
        <Button variant="quiet" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
}: Readonly<{ title?: string; action?: ReactNode; children: ReactNode }>) {
  return (
    <section className="grid gap-3 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-[17px] leading-6 font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A label above a value, for the facts on a detail page. */
export function Fact({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="text-[15px] break-words">{children}</dd>
    </div>
  );
}

export const tableClass = "w-full min-w-[640px] border-collapse text-left text-[14px]";
export const thClass =
  "border-b border-line px-3 py-2 text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase";
export const tdClass = "border-b border-line px-3 py-2.5 align-top";
