"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FlowStep = Readonly<{
  id: string;
  title: string;
  /** What the person has answered so far, shown under the title. */
  answer?: ReactNode;
}>;

/**
 * A task done in a few steps. From a tablet up, the steps are listed on the left with what has been
 * answered so far, beside a green card that says where the answers add up to; the step being done is
 * on the right and the earlier ones can be reopened. A phone shows only the step, with "Step 2 of 4".
 */
export function StepFlow({
  label,
  steps,
  current,
  onJump,
  summary,
  children,
}: Readonly<{
  label: string;
  steps: readonly FlowStep[];
  current: string;
  onJump: (id: string) => void;
  summary: ReactNode;
  children: ReactNode;
}>) {
  const at = Math.max(
    0,
    steps.findIndex((s) => s.id === current),
  );
  return (
    <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="hidden gap-4 lg:sticky lg:top-28 lg:grid">
        <section
          aria-label="Where this adds up"
          className="hero-card grid gap-1 rounded-[var(--radius-xl)] p-5 shadow-lift"
        >
          {summary}
        </section>
        <ol
          aria-label={label}
          className="grid gap-1 rounded-[20px] bg-surface-raised p-2 shadow-lift"
        >
          {steps.map((s, i) => {
            const done = i < at;
            const on = i === at;
            const body = (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold",
                    done
                      ? "bg-primary text-on-primary"
                      : on
                        ? "bg-primary-tint text-primary"
                        : "bg-surface-sunken text-ink-muted",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="grid min-w-0 text-left">
                  <span className={cn("text-[15px]", on ? "font-semibold" : "font-medium")}>
                    {s.title}
                  </span>
                  {s.answer && (
                    <span className="truncate text-[13px] text-ink-muted">{s.answer}</span>
                  )}
                </span>
              </>
            );
            return (
              <li key={s.id} aria-current={on ? "step" : undefined}>
                {done ? (
                  <button
                    type="button"
                    onClick={() => onJump(s.id)}
                    className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 hover:bg-surface-sunken"
                  >
                    {body}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-[14px] px-3 py-2.5",
                      on && "bg-primary-tint/50",
                    )}
                  >
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </aside>
      <div className="min-w-0">
        <p className="mb-3 text-[13px] font-semibold text-ink-muted lg:hidden">
          Step {at + 1} of {steps.length}
        </p>
        {children}
      </div>
    </div>
  );
}

/** The card a step's fields sit in, with its question as the heading. */
export function StepCard({
  title,
  note,
  children,
}: Readonly<{ title: string; note?: string; children: ReactNode }>) {
  return (
    <section
      aria-labelledby="step-title"
      className="grid gap-6 rounded-[var(--radius-xl)] bg-surface-raised p-5 shadow-lift md:p-8"
    >
      <div className="grid gap-1">
        <h2
          id="step-title"
          className="font-display text-[22px] leading-7 font-bold md:text-[26px] md:leading-8"
        >
          {title}
        </h2>
        {note && <p className="text-[15px] text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** Back on the left, the way on on the right; stacked and full width on a phone. */
export function StepActions({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid gap-3 md:flex md:flex-row-reverse md:items-center md:justify-between">
      {children}
    </div>
  );
}
