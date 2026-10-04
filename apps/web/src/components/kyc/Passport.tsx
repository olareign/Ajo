import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { stepOf, stamped, REQUIRED_STEPS, type KycState, type StepKey } from "@/lib/kyc";
import { countryConfig, STEP_COPY } from "@/lib/kyc-config";
import { Stitches } from "@/components/ui/Stitches";
import { Stamp } from "./Stamp";

type Props = Readonly<{
  state: KycState;
  holder: string;
  handle?: string | null;
  /** Where each stamp leads; nothing leads anywhere while the steps are locked. */
  hrefFor?: (step: StepKey) => string;
  /** A stamp that has just landed thunks down. */
  fresh?: StepKey;
}>;

/**
 * The member's passport: a green cover and a page of stamp slots. Verification is not a form to
 * get through but a page to fill, one stamp at a time; the last stamp opens everything else.
 */
export function Passport({ state, holder, handle, hrefFor, fresh }: Props) {
  const config = countryConfig(state.country);
  const slots: StepKey[] = [
    ...REQUIRED_STEPS,
    ...(config?.nationalCheck ? (["national_check"] as const) : []),
  ];
  const done = stamped(state);

  return (
    <section aria-label="Your Àjọ passport" className="grid grid-cols-1 gap-0">
      <header className="relative grid gap-4 rounded-t-[var(--radius-l)] bg-primary-deep p-5 text-on-primary">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-[calc(var(--radius-l)-8px)] border-[1.5px] border-dashed border-on-primary/30"
        />
        <p className="text-[11px] font-semibold tracking-[0.14em] text-on-primary/80">
          ÀJỌ MEMBER PASSPORT
        </p>
        <div className="flex items-end justify-between gap-3">
          <div className="grid min-w-0 gap-0.5">
            <p className="truncate font-display text-[26px] leading-8 font-bold">{holder}</p>
            {handle && <p className="truncate text-[15px] text-on-primary/85">@{handle}</p>}
          </div>
          <p className="shrink-0 font-display text-[34px] leading-none font-bold tracking-[-0.02em] text-oro">
            Àjọ
          </p>
        </div>
      </header>

      <div className="relative -mt-px grid gap-5 rounded-b-[var(--radius-l)] bg-oro-tint px-4 pt-6 pb-5">
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-5">
          {slots.map((step) => (
            <li key={step} className="grid basis-[30%] justify-items-center gap-1.5">
              <Slot
                link={hrefFor?.(step)}
                locked={!hrefFor}
                title={STEP_COPY[step].title}
                status={stepOf(state, step).status}
              >
                <Stamp
                  label={STEP_COPY[step].stamp}
                  title={STEP_COPY[step].title}
                  status={stepOf(state, step).status}
                  fresh={fresh === step}
                  size={92}
                  className={cn(
                    step === "national_check" &&
                      stepOf(state, step).status === "not_started" &&
                      "opacity-70",
                  )}
                />
              </Slot>
              <span className="text-[12px] font-semibold text-ink-muted">
                {step === "national_check" ? "Optional" : STEP_COPY[step].title}
              </span>
            </li>
          ))}
        </ul>
        <Stitches
          total={REQUIRED_STEPS.length}
          done={done}
          label="Passport progress"
          caption={`${done} of ${REQUIRED_STEPS.length} stamped`}
        />
      </div>
    </section>
  );
}

function Slot({
  link,
  locked,
  title,
  status,
  children,
}: Readonly<{
  link?: string;
  locked: boolean;
  title: string;
  status: string;
  children: ReactNode;
}>) {
  if (link) {
    return (
      <Link
        href={link}
        aria-label={`${title}: open (${status.replace("_", " ")})`}
        className="rounded-full"
      >
        {children}
      </Link>
    );
  }
  return (
    <span className="relative" data-locked={locked ? "" : undefined}>
      {children}
      {locked && (
        <Lock
          aria-hidden
          className="absolute right-1 bottom-1 size-5 rounded-full bg-surface-raised p-1 text-ink-muted shadow-lift"
        />
      )}
    </span>
  );
}
