"use client";

import { Calendar, CheckCircle2, ShieldAlert, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { CircleRing, type RingMember } from "@/components/CircleRing";
import { cn } from "@/lib/cn";
import { SAMPLE_CIRCLE } from "@/lib/sample-circle";

const NGN_PRESETS = [25_000, 50_000, 100_000, 200_000] as const;
const GBP_PRESETS = [50, 100, 250, 500] as const;

type Currency = "NGN" | "GBP";

function formatCurrency(amount: number, currency: Currency): string {
  if (currency === "NGN") {
    return `₦${amount.toLocaleString("en-NG")}`;
  }
  return `£${amount.toLocaleString("en-GB")}`;
}

export function InteractiveCircleSimulator({
  photos = [],
}: Readonly<{ photos?: readonly string[] }>) {
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [contribution, setContribution] = useState<number>(50_000);
  const [selectedRecipient, setSelectedRecipient] = useState<number>(2); // Default to Funmi (Index 2)
  const [simulateMissed, setSimulateMissed] = useState<boolean>(false);

  const presets = currency === "NGN" ? NGN_PRESETS : GBP_PRESETS;
  const totalPot = contribution * SAMPLE_CIRCLE.length;

  function handleCurrencyChange(next: Currency) {
    setCurrency(next);
    setContribution(next === "NGN" ? 50_000 : 100);
  }

  // Construct members status based on whether missed payment simulation is active
  const members: RingMember[] = SAMPLE_CIRCLE.map((member, i) => {
    let status: RingMember["status"] = member.status;
    if (simulateMissed && i === 3) {
      // Chidi Obi gets covered by deposit
      status = "covered";
    }
    return {
      name: member.name,
      status,
      photo: photos[i],
    };
  });

  const currentMember = SAMPLE_CIRCLE[selectedRecipient];

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface-raised p-6 shadow-lift transition-all lg:p-8">
      {/* Subtle top accent gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-oro to-primary-deep" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-tint text-primary">
            <Sparkles className="size-3.5" />
          </span>
          <div>
            <h3 className="text-[15px] font-bold tracking-tight">Interactive Circle Simulator</h3>
            <p className="text-[12px] text-ink-muted">Live payout preview & safety mechanism</p>
          </div>
        </div>

        {/* Currency Switcher */}
        <div
          role="radiogroup"
          aria-label="Simulation currency"
          className="flex items-center rounded-full border border-line bg-surface-sunken p-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={currency === "NGN"}
            onClick={() => handleCurrencyChange("NGN")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all",
              currency === "NGN"
                ? "bg-surface-raised text-primary shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            ₦ NGN
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={currency === "GBP"}
            onClick={() => handleCurrencyChange("GBP")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all",
              currency === "GBP"
                ? "bg-surface-raised text-primary shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            £ GBP
          </button>
        </div>
      </div>

      <div className="grid gap-6 pt-6 xl:grid-cols-[1.1fr_1fr] xl:items-center">
        {/* Left: Circle ring & seat scrubber */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative py-2">
            <CircleRing
              members={members}
              recipient={selectedRecipient}
              title={`Simulation round ${selectedRecipient + 1} of 8`}
              center={{
                label: `ROUND ${selectedRecipient + 1} POT`,
                value: formatCurrency(totalPot, currency),
              }}
              size={300}
              roll={false}
            />
          </div>

          {/* Turn Scrubber */}
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-muted">
              <span>Select turn / recipient:</span>
              <span className="font-semibold text-primary">Turn {selectedRecipient + 1} of 8</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5" role="tablist" aria-label="Circle turns">
              {SAMPLE_CIRCLE.map((m, idx) => {
                const isSelected = idx === selectedRecipient;
                return (
                  <button
                    key={m.name}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-label={`Select Turn ${idx + 1}: ${m.name}`}
                    onClick={() => setSelectedRecipient(idx)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl py-2 text-xs font-bold transition-all",
                      isSelected
                        ? "bg-oro text-on-oro shadow-md ring-2 ring-oro/30 scale-105"
                        : "border border-line bg-surface-sunken text-ink-muted hover:bg-surface-raised hover:text-ink",
                    )}
                  >
                    <span>#{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Controls & Real-time Financial Breakdown */}
        <div className="flex flex-col gap-4">
          {/* Amount Presets */}
          <div className="grid gap-2">
            <label
              htmlFor="contribution-selector"
              className="text-xs font-bold text-ink-muted uppercase tracking-wider"
            >
              Contribution per member (Monthly)
            </label>
            <div id="contribution-selector" className="grid grid-cols-4 gap-2">
              {presets.map((preset) => {
                const isSelected = contribution === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setContribution(preset)}
                    className={cn(
                      "rounded-xl border py-2.5 text-center text-xs font-bold transition-all",
                      isSelected
                        ? "border-primary bg-primary text-on-primary shadow-sm"
                        : "border-line bg-surface-sunken text-ink hover:border-line-strong hover:bg-surface-raised",
                    )}
                  >
                    {formatCurrency(preset, currency)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Snapshot Card */}
          <div className="rounded-2xl border border-line bg-surface-sunken/60 p-4 transition-all">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-oro text-on-oro text-xs font-bold shadow-sm">
                  #{selectedRecipient + 1}
                </span>
                <div>
                  <div className="text-[14px] font-bold text-ink">{currentMember?.name}</div>
                  <div className="text-[11px] text-ink-muted">
                    Round {selectedRecipient + 1} Recipient
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-[17px] font-bold text-primary">
                  {formatCurrency(totalPot, currency)}
                </div>
                <div className="text-[11px] font-medium text-ink-muted">Full pot payout</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
              <div className="flex items-center gap-2 text-ink-muted">
                <Users className="size-3.5 text-primary" />
                <span>8 verified savers</span>
              </div>
              <div className="flex items-center gap-2 text-ink-muted">
                <Calendar className="size-3.5 text-primary" />
                <span>Next payout: 1st of month</span>
              </div>
            </div>
          </div>

          {/* Interactive Safety Simulation Toggle */}
          <div className="rounded-2xl border border-line bg-surface-raised p-4 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                    simulateMissed ? "bg-tertiary-tint text-tertiary" : "bg-leaf-tint text-leaf",
                  )}
                >
                  {simulateMissed ? (
                    <ShieldAlert className="size-4" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                </span>
                <div>
                  <span className="block text-[13px] font-bold text-ink">Deposit Shield</span>
                  <span className="block text-[11px] text-ink-muted">
                    Test what happens if a member is unable to pay
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={simulateMissed}
                aria-label="Simulate missed payment"
                onClick={() => setSimulateMissed(!simulateMissed)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  simulateMissed ? "bg-tertiary" : "bg-line-strong/40",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                    simulateMissed ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            {simulateMissed ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-tertiary-tint/70 p-2.5 text-[12px] leading-relaxed text-ink transition-all">
                <CheckCircle2 className="size-4 shrink-0 text-tertiary mt-0.5" />
                <span>
                  <strong>Covered automatically:</strong> Chidi&apos;s locked deposit immediately
                  funded round #{selectedRecipient + 1}. {currentMember?.name} still collects the
                  complete <strong>{formatCurrency(totalPot, currency)}</strong> on schedule.
                </span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-muted">
                <CheckCircle2 className="size-3.5 text-leaf" />
                <span>All 8 members are verified and backed by locked security deposits.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
