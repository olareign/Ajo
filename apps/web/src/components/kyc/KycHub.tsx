"use client";

import { ShieldCheck } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { nextStep, type KycState, type PreviewKind } from "@/lib/kyc";
import { countryConfig, STEP_COPY } from "@/lib/kyc-config";
import { useKycFlow } from "./KycFlow";
import { Passport } from "./Passport";

const OUTCOMES: readonly { kind: PreviewKind; label: string }[] = [
  { kind: "fresh", label: "New" },
  { kind: "waiting", label: "Waiting" },
  { kind: "refused", label: "Refused" },
  { kind: "approved", label: "Approved" },
];

/** The passport: where verification starts, where it is picked up, and where its result shows. */
export function KycHub() {
  const { me, preview, state, href, showOutcome } = useKycFlow();
  const locked = !preview && !state.connected;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && (
        <PreviewRibbon exitHref="/verify">
          <div role="group" aria-label="See another outcome" className="flex flex-wrap gap-1.5">
            {OUTCOMES.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => showOutcome(kind)}
                className="rounded-full bg-on-oro/10 px-3 py-1 text-[12px] font-semibold hover:bg-on-oro/20"
              >
                {label}
              </button>
            ))}
          </div>
        </PreviewRibbon>
      )}
      <ScreenHeader
        title="Your Àjọ passport"
        subtitle="Fill the page with stamps and you're a verified member."
        backHref="/today"
      />
      <div className="grid grid-cols-1 gap-6">
        {locked && <NotSwitchedOn />}
        <Passport
          state={state}
          holder={me.displayName}
          handle={me.username}
          hrefFor={locked ? undefined : (step) => href(`/verify/${step}`)}
        />
        {(!locked || state.status !== "not_started") && <StatusBanner state={state} href={href} />}
      </div>
    </main>
  );
}

function NotSwitchedOn() {
  return (
    <div
      role="note"
      className="grid gap-3 rounded-[var(--radius-l)] border-[1.5px] border-dashed border-oro-ink/40 bg-oro-tint p-4 text-oro-ink"
    >
      <p className="text-[15px] leading-6 font-semibold">Verification isn&apos;t switched on yet</p>
      <p className="text-[14px] leading-5">
        We&apos;re connecting our identity partner, so the stamps are locked for now. You can walk
        through every step in a preview: nothing is saved or sent.
      </p>
      <ButtonLink href="/verify?preview=1" variant="quiet">
        Preview the flow
      </ButtonLink>
    </div>
  );
}

function StatusBanner({
  state,
  href,
}: Readonly<{ state: KycState; href: (path: string) => string }>) {
  const config = countryConfig(state.country);
  const next = nextStep(state);
  const refused = state.steps.filter((s) => s.status === "rejected" && s.required);

  if (state.status === "approved") {
    const offerBvn = config?.nationalCheck && state.tier === 1;
    return (
      <Banner icon tone="leaf" title="Passport approved">
        <p>Saving, joining circles and adding friends are open to you now.</p>
        {offerBvn && (
          <ButtonLink href={href("/verify/national_check")} variant="quiet">
            Add your BVN
          </ButtonLink>
        )}
      </Banner>
    );
  }
  if (state.status === "rejected") {
    return (
      <Banner tone="danger" title="A stamp needs another try">
        <ul className="grid gap-4">
          {refused.map((s) => (
            <li key={s.step} className="grid gap-2">
              <p>
                <strong>{STEP_COPY[s.step].title}:</strong>{" "}
                {s.reason ?? "We couldn't confirm this one."}
              </p>
              <ButtonLink href={href(`/verify/${s.step}`)}>Try again</ButtonLink>
            </li>
          ))}
        </ul>
      </Banner>
    );
  }
  if (state.status === "pending") {
    return (
      <Banner tone="muted" title="Waiting on a decision">
        <p>We&apos;re checking the rest. You can leave this page; the result shows here.</p>
        {next && <ButtonLink href={href(`/verify/${next}`)}>Continue</ButtonLink>}
      </Banner>
    );
  }
  if (state.status === "in_progress") {
    return (
      <Banner tone="muted" title="Keep going">
        <p>Pick up where you stopped.</p>
        {next && <ButtonLink href={href(`/verify/${next}`)}>Continue</ButtonLink>}
      </Banner>
    );
  }
  return (
    <Banner tone="muted" title="Start your passport">
      <p>Five short stamps, about five minutes. Have your ID and a recent bill to hand.</p>
      <ButtonLink href={href("/verify/id")}>Start</ButtonLink>
    </Banner>
  );
}

const TONES = {
  leaf: "bg-leaf-tint text-leaf",
  danger: "bg-danger-tint text-ink",
  muted: "bg-surface-raised text-ink shadow-lift",
} as const;

function Banner({
  title,
  tone,
  icon,
  children,
}: Readonly<{
  title: string;
  tone: keyof typeof TONES;
  icon?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <section
      className={`grid gap-3 rounded-[var(--radius-l)] p-5 text-[15px] leading-6 ${TONES[tone]}`}
    >
      <h2 className="flex items-center gap-2 font-display text-[20px] leading-6 font-semibold">
        {icon && <ShieldCheck aria-hidden className="size-6" />}
        {title}
      </h2>
      {children}
    </section>
  );
}
