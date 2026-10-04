import { Check, Landmark, RotateCcw } from "lucide-react";
import { Amount } from "@/components/ui/Amount";
import { cn } from "@/lib/cn";

type Props = Readonly<{
  bank: string;
  /** Kobo or pence. */
  minor: string;
  currency: string;
  locale: string;
  /** How many of the three steps are done: 0 to 3. */
  stage: number;
  outcome: "arrived" | "reversed";
}>;

/** A withdrawal as a ticket that follows the money to the bank, and says in words if it comes back. */
export function WithdrawTicket({ bank, minor, currency, locale, stage, outcome }: Props) {
  const stages = [
    { label: "Received", detail: "We have your request" },
    { label: `Sent to ${bank}`, detail: "On its way to your account" },
    outcome === "arrived"
      ? { label: "Arrived", detail: `In your ${bank} account` }
      : {
          label: "Sent back",
          detail: "Your bank couldn't take it. The money is back in your wallet",
        },
  ];
  return (
    <section
      aria-label="Your withdrawal"
      className="relative grid gap-5 rounded-[var(--radius-l)] bg-surface-raised px-5 py-6 shadow-lift"
    >
      <div className="grid gap-1">
        <p className="text-[13px] font-semibold tracking-[0.04em] text-ink-muted">
          TO {bank.toUpperCase()}
        </p>
        <Amount amount={minor} currency={currency} locale={locale} size="xl" />
      </div>
      <ol aria-live="polite" className="grid gap-4 border-t-2 border-dashed border-line pt-5">
        {stages.map((s, i) => {
          const reached = stage > i;
          const current = stage === i;
          const isReturn = outcome === "reversed" && i === 2;
          return (
            <li
              key={s.label}
              data-reached={reached ? "" : undefined}
              className={cn(
                "flex items-start gap-3 transition-opacity duration-300",
                reached || current ? "opacity-100" : "opacity-35",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                  reached
                    ? isReturn
                      ? "bg-danger-tint text-danger"
                      : "bg-leaf-tint text-leaf"
                    : "bg-surface-sunken text-ink-muted",
                )}
              >
                {reached ? (
                  isReturn ? (
                    <RotateCcw aria-hidden className="size-3.5" />
                  ) : (
                    <Check aria-hidden className="size-3.5" />
                  )
                ) : (
                  <Landmark aria-hidden className="size-3.5" />
                )}
              </span>
              <span className="grid gap-0.5">
                <span className="text-[15px] font-semibold">{s.label}</span>
                <span className="text-[14px] leading-5 text-ink-muted">{s.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
