"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageOf, postJson } from "@/components/auth/post-json";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { OptionCards, type CardOption } from "@/components/ui/OptionCards";
import { PinPad } from "@/components/ui/PinPad";

const COUNTRIES: readonly CardOption[] = [
  { value: "NG", title: "Nigeria", detail: "Save and receive in naira (₦)" },
  { value: "GB", title: "United Kingdom", detail: "Save and receive in pounds (£)" },
];
const GOALS: readonly CardOption[] = [
  {
    value: "solo",
    title: "Save on my own",
    detail: "Set a goal and put money aside, a little at a time",
  },
  {
    value: "circle",
    title: "Save with a circle",
    detail: "Pool money with people you trust, taking turns",
  },
  {
    value: "both",
    title: "Both",
    detail: "Start with whichever you like; you can do the other later",
  },
];
const STEPS = ["country", "goal", "pin", "confirm"] as const;
type Step = (typeof STEPS)[number];

const TITLES: Record<Step, string> = {
  country: "Where do you live?",
  goal: "What brings you to Àjọ?",
  pin: "Choose a PIN",
  confirm: "Confirm your PIN",
};

export function Onboarding({ name }: Readonly<{ name: string }>) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const index = STEPS.indexOf(step);
  const subtitle: Record<Step, string> = {
    country: `Welcome, ${name}. This sets your currency and the rules that apply to you.`,
    goal: "Pick what fits now. Nothing here is locked in.",
    pin: "Six digits you'll use to approve moving money. Don't share it, not even with us.",
    confirm: "Enter the same six digits once more.",
  };

  function back() {
    setError(undefined);
    if (step === "confirm") {
      setAgain("");
      setPin("");
    }
    setStep(STEPS[index - 1]!);
  }

  async function finish() {
    if (again !== pin) {
      setError("Those PINs didn't match. Choose your PIN again.");
      setPin("");
      setAgain("");
      setStep("pin");
      return;
    }
    setBusy(true);
    setError(undefined);
    const profile = await postJson("/api/me/profile", { country, goal }, "PUT");
    if (!profile.ok) {
      setError(messageOf(profile));
      setBusy(false);
      return;
    }
    const saved = await postJson("/api/me/pin", { pin }, "PUT");
    // 409 means a PIN is already set (an earlier try got that far); the profile is saved either way.
    if (!saved.ok && saved.status !== 409) {
      setError(messageOf(saved));
      setPin("");
      setAgain("");
      setStep("pin");
      setBusy(false);
      return;
    }
    router.replace("/today");
  }

  const canContinue =
    (step === "country" && country) ||
    (step === "goal" && goal) ||
    (step === "pin" && pin.length === 6) ||
    (step === "confirm" && again.length === 6);

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <ScreenHeader
        eyebrow={`Step ${index + 1} of ${STEPS.length}`}
        title={TITLES[step]}
        subtitle={subtitle[step]}
        onBack={index > 0 ? back : undefined}
      />
      <div className="flex flex-1 flex-col">
        {step === "country" && (
          <OptionCards label="Country" options={COUNTRIES} value={country} onChange={setCountry} />
        )}
        {step === "goal" && (
          <OptionCards label="Goal" options={GOALS} value={goal} onChange={setGoal} />
        )}
        {step === "pin" && <PinPad label="New PIN" value={pin} onChange={setPin} />}
        {step === "confirm" && <PinPad label="Confirm PIN" value={again} onChange={setAgain} />}
        {error && (
          <p role="alert" className="mt-5 text-center text-[15px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="mt-auto pt-4">
          <Button
            size="lg"
            block
            disabled={busy || !canContinue}
            onClick={() => (step === "confirm" ? void finish() : setStep(STEPS[index + 1]!))}
          >
            {busy ? "One moment…" : step === "confirm" ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
    </main>
  );
}
