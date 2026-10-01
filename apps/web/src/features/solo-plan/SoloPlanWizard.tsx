"use client";

import {
  formatMoney,
  planSchedule,
  type CalendarDate,
  type Duration,
  type Frequency,
  type Money,
} from "@ajo/domain";
import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { useReducer, type ReactNode } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { TextField } from "@/components/ui/TextField";
import {
  AMOUNT_PRESETS,
  DURATION_PRESETS,
  amountError,
  canProceed,
  createWizardState,
  resolvedAmount,
  resolvedDuration,
  wizardReducer,
} from "./wizard";

export type NewSoloPlan = Readonly<{
  name: string;
  amount: Money;
  frequency: Frequency;
  duration: Duration;
  startDate: CalendarDate;
}>;

type Props = Readonly<{
  currency: string;
  locale: string;
  today: CalendarDate;
  onCreate: (plan: NewSoloPlan) => void;
}>;

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function durationLabel(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return months === 1 ? "1 month" : `${months} Months`;
}

function formatDate(date: CalendarDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function Screen({ children, footer }: Readonly<{ children: ReactNode; footer: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col px-6 pt-6 pb-8">
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}

/** Solo savings plan creation, following the "SELECT SAVINGS" screens in Figma. */
export function SoloPlanWizard({ currency, locale, today, onCreate }: Props) {
  const [state, dispatch] = useReducer(wizardReducer, currency, createWizardState);
  const back = () => dispatch({ type: "back" });
  const proceed = (
    <Button disabled={!canProceed(state)} onClick={() => dispatch({ type: "next" })}>
      Proceed
    </Button>
  );
  const number = new Intl.NumberFormat(locale);

  switch (state.step) {
    case "name":
      return (
        <Screen footer={proceed}>
          <ScreenHeader eyebrow="We Move!" title="What are you saving for?" backHref="/" />
          <TextField
            label="Plan Name"
            value={state.name}
            onChange={(name) => dispatch({ type: "setName", name })}
            placeholder="e.g. Aso Ebi"
            autoFocus
          />
        </Screen>
      );

    case "amount":
      return (
        <Screen footer={proceed}>
          <ScreenHeader
            eyebrow="Lets Go!"
            title="How much would you like to start with?"
            onBack={back}
          />
          <div className="space-y-8">
            <div className="space-y-4">
              <ChoiceChips
                label="Amount"
                hideLabel
                value={state.amountChoice}
                onChange={(choice) => dispatch({ type: "chooseAmount", choice })}
                options={[
                  ...AMOUNT_PRESETS.map((n) => ({ value: String(n), label: number.format(n) })),
                  { value: "custom", label: "Specify Amount" },
                ]}
              />
              {state.amountChoice === "custom" && (
                <TextField
                  label={`Amount (${currency})`}
                  inputMode="decimal"
                  value={state.customAmount}
                  onChange={(text) => dispatch({ type: "setCustomAmount", text })}
                  error={amountError(state) ?? undefined}
                />
              )}
            </div>
            <ChoiceChips
              label="How often?"
              value={state.frequency}
              onChange={(f) => dispatch({ type: "chooseFrequency", frequency: f as Frequency })}
              options={FREQUENCIES}
            />
          </div>
        </Screen>
      );

    case "duration":
      return (
        <Screen footer={proceed}>
          <ScreenHeader
            eyebrow="Lets Go!"
            title="How long do you want to save for?"
            onBack={back}
          />
          <div className="space-y-4">
            <ChoiceChips
              label="Duration"
              hideLabel
              value={state.durationChoice}
              onChange={(choice) => dispatch({ type: "chooseDuration", choice })}
              options={[
                ...DURATION_PRESETS.map((m) => ({ value: String(m), label: durationLabel(m) })),
                { value: "custom", label: "Specify Duration" },
              ]}
            />
            {state.durationChoice === "custom" && (
              <TextField
                label="Number of months"
                inputMode="numeric"
                value={state.customDuration}
                onChange={(text) => dispatch({ type: "setCustomDuration", text })}
              />
            )}
          </div>
        </Screen>
      );

    case "review": {
      // canProceed() guarantees these on earlier steps.
      const amount = resolvedAmount(state) as Money;
      const duration = resolvedDuration(state) as Duration;
      const frequency = state.frequency as Frequency;
      const plan = planSchedule({ amount, frequency, duration, startDate: today });
      const rows: [string, string][] = [
        ["Plan", state.name.trim()],
        ["Amount", `${formatMoney(amount, locale)} ${frequency}`],
        ["Duration", durationLabel(duration.count)],
        ["Deposits", String(plan.depositCount)],
        ["First debit", formatDate(plan.debitDates[0] as CalendarDate, locale)],
        ["Maturity date", formatDate(plan.maturityDate, locale)],
        ["Estimated amount", formatMoney(plan.total, locale)],
      ];
      return (
        <Screen
          footer={
            <Button
              onClick={() => {
                onCreate({
                  name: state.name.trim(),
                  amount,
                  frequency,
                  duration,
                  startDate: today,
                });
                dispatch({ type: "next" });
              }}
            >
              Proceed
            </Button>
          }
        >
          <ScreenHeader eyebrow="Almost there!" title="Your selections" onBack={back} />
          <ul aria-label="Plan summary" className="space-y-5 rounded-field bg-brand-50 p-4">
            {rows.map(([label, value]) => (
              <li key={label} className="flex justify-between gap-4 text-sm">
                <span className="text-ink-muted">{label}</span>
                <span className="text-right font-semibold text-ink">{value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            Deposits are taken automatically by direct debit on each date. The estimated amount is
            exactly what you put in.
          </p>
        </Screen>
      );
    }

    case "done":
      return (
        <Screen
          footer={
            <Link
              href="/home"
              className="flex h-12 w-full items-center justify-center rounded-field bg-brand-600 text-white hover:bg-brand-700"
            >
              Return to dashboard
            </Link>
          }
        >
          <div className="flex h-full flex-col items-center justify-center pt-24 text-center">
            <PartyPopper aria-hidden className="mb-10 size-32 text-amber-400" strokeWidth={1.25} />
            <h1 className="mb-3 text-xl font-bold text-brand-600">Nice one Boss!</h1>
            <p className="max-w-64 text-ink">
              My Oga, you&apos;re on your way to saving something <strong>HOOGE.</strong>
            </p>
          </div>
        </Screen>
      );
  }
}
