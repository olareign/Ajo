"use client";

import { Lock } from "lucide-react";
import { useCallback, useEffect, useRef, type ComponentType } from "react";
import { useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { ALL_STEPS, nextStep, stepOf, type StepKey } from "@/lib/kyc";
import { countryConfig, STEP_COPY } from "@/lib/kyc-config";
import { PREVIEW_CHECK_MS, pause, previewAccountName, previewRefusal } from "@/lib/preview";
import { useKycFlow } from "./KycFlow";
import { Stamp } from "./Stamp";
import { AddressStep } from "./steps/AddressStep";
import { BankStep } from "./steps/BankStep";
import { IdStep } from "./steps/IdStep";
import { LocationStep } from "./steps/LocationStep";
import { NationalStep } from "./steps/NationalStep";
import { SelfieStep } from "./steps/SelfieStep";
import type { Outcome, StepProps } from "./steps/types";

const STEPS: Record<StepKey, ComponentType<StepProps>> = {
  id: IdStep,
  selfie: SelfieStep,
  address: AddressStep,
  location: LocationStep,
  bank: BankStep,
  national_check: NationalStep,
};

const isStep = (value: string): value is StepKey =>
  (ALL_STEPS as readonly string[]).includes(value);

/** One stamp's screen: the form, the pretend (or real) check, and the stamp landing on the page. */
export function StepScreen({ step: raw }: Readonly<{ step: string }>) {
  const flow = useKycFlow();
  const { me, preview, state, href } = flow;
  const config = countryConfig(state.country);
  const [stamped, setStamped] = useState(false);
  const [tried, setTried] = useState(false);

  // The same function for the life of the screen, however often the flow's state changes under it.
  const latest = useRef<StepProps["submit"]>(async () => ({ ok: false, message: "" }));
  const step = isStep(raw) ? raw : null;
  useEffect(() => {
    if (!step) return;
    latest.current = async (input): Promise<Outcome> => {
      // A real submission goes to the connected partner through our server. Until one is connected
      // this screen is only reached as a preview, so there is nothing real to send yet.
      if (!preview) return { ok: false, message: "This step isn't connected yet." };
      setTried(true);
      await pause(PREVIEW_CHECK_MS);
      const refusal = previewRefusal(step, input);
      if (refusal) {
        flow.settle(step, "rejected", refusal);
        return { ok: false, message: refusal };
      }
      flow.settle(step, "approved");
      setStamped(true);
      return { ok: true };
    };
  });
  const submit = useCallback<StepProps["submit"]>((input) => latest.current(input), []);
  const resolveName = useCallback(
    async (number: string) => {
      await pause(PREVIEW_CHECK_MS / 2);
      return previewAccountName(number, me.displayName);
    },
    [me.displayName],
  );

  const back = href("/verify");
  const ribbon = preview ? <PreviewRibbon exitHref="/verify" /> : null;

  if (!step || !config || (step === "national_check" && !config.nationalCheck)) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pt-6">
        <ScreenHeader title="That stamp isn't here" backHref={back} />
        <p className="text-ink-muted">There&apos;s no such step for your passport.</p>
      </main>
    );
  }

  const copy = STEP_COPY[step];
  const Body = STEPS[step];

  if (!preview && !state.connected) {
    return (
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
        <ScreenHeader title={copy.title} subtitle={copy.blurb} backHref={back} />
        <div className="grid justify-items-center gap-5 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift">
          <Stamp label={copy.stamp} title={copy.title} status="not_started" size={120} />
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <Lock aria-hidden className="size-4" />
            Not switched on yet
          </p>
          <p className="text-[15px] leading-6 text-ink-muted">
            We&apos;re connecting our identity partner. This stamp opens as soon as that&apos;s
            done.
          </p>
          <ButtonLink href={`/verify/${step}?preview=1`} variant="quiet">
            Preview this step
          </ButtonLink>
        </div>
      </main>
    );
  }

  if (stamped) {
    const next = nextStep(state);
    return (
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
        {ribbon}
        <div className="grid justify-items-center gap-6 pt-10 text-center">
          <Stamp label={copy.stamp} title={copy.title} status="approved" fresh size={176} />
          <h1 className="font-display text-[30px] leading-9 font-bold text-primary">
            {copy.title} stamped
          </h1>
          <p className="text-[17px] leading-[26px] text-ink-muted">
            {next
              ? "One more page of the passport filled."
              : "That's everything. Your passport is complete."}
          </p>
          <ButtonLink
            href={next && step !== "national_check" ? href(`/verify/${next}`) : back}
            size="lg"
            block
          >
            {next && step !== "national_check"
              ? `Next: ${STEP_COPY[next].title}`
              : "See my passport"}
          </ButtonLink>
        </div>
      </main>
    );
  }

  const status = stepOf(state, step);
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {ribbon}
      <ScreenHeader title={copy.title} subtitle={copy.blurb} backHref={back} />
      {status.status === "rejected" && status.reason && !tried && (
        <p
          role="alert"
          className="mb-5 rounded-[var(--radius-l)] bg-danger-tint p-4 text-[15px] leading-6"
        >
          Last time: {status.reason}
        </p>
      )}
      <Body
        country={config === countryConfig("GB") ? "GB" : "NG"}
        config={config}
        holder={me.displayName}
        submit={submit}
        resolveName={resolveName}
      />
      {preview && (
        <p className="mt-6 text-center text-[12px] leading-5 text-ink-muted">
          Tip for reviewers: an ID, BVN or account number ending 0000, or a file called
          &ldquo;blurry&rdquo;, shows what a refusal looks like.
        </p>
      )}
    </main>
  );
}
