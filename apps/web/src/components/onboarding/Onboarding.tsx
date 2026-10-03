"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { messageOf, postJson } from "@/components/auth/post-json";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { OptionCards, type CardOption } from "@/components/ui/OptionCards";
import { PinPad } from "@/components/ui/PinPad";
import { normalizeUsername } from "@/lib/username";
import { HandlePicker } from "./HandlePicker";
import { HowItWorks } from "./HowItWorks";
import type { Me } from "./MeGate";
import { useUsernameCheck } from "./useUsernameCheck";

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

type Step = "story" | "country" | "goal" | "handle" | "pin" | "confirm";

const TITLES: Record<Exclude<Step, "story">, string> = {
  country: "Where do you live?",
  goal: "What brings you to Àjọ?",
  handle: "Pick your handle",
  pin: "Choose a PIN",
  confirm: "Confirm your PIN",
};

/**
 * Only what is still missing. Someone who stopped part-way (or who set up before usernames existed)
 * is asked for the rest and nothing they have already given; the scenes are for a brand-new person.
 */
function stepsFor(me: Me): Step[] {
  const untouched = !me.country && !me.goal && !me.username && !me.hasPin;
  return [
    ...(untouched ? (["story"] as const) : []),
    ...(me.country ? [] : (["country"] as const)),
    ...(me.goal ? [] : (["goal"] as const)),
    ...(me.username ? [] : (["handle"] as const)),
    ...(me.hasPin ? [] : (["pin", "confirm"] as const)),
  ];
}

type Props = Readonly<{ me: Me; photos: readonly string[] }>;

export function Onboarding({ me, photos }: Props) {
  const router = useRouter();
  const [steps] = useState(() => stepsFor(me));
  const [at, setAt] = useState(0);
  const [country, setCountry] = useState<string | null>(me.country ?? null);
  const [goal, setGoal] = useState<string | null>(me.goal ?? null);
  const [username, setUsername] = useState("");
  const [refused, setRefused] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const check = useUsernameCheck(username, refused);

  const step = steps[at];
  const questions: Step[] = steps.filter((s) => s !== "story");
  const number = step ? questions.indexOf(step) : -1;
  const last = at === steps.length - 1;
  const firstQuestion = steps[0] === "story" ? 1 : 0;

  useEffect(() => {
    if (steps.length === 0) router.replace("/today");
  }, [steps, router]);

  if (!step) return null;
  if (step === "story") {
    return <HowItWorks photos={photos} onFinish={() => setAt(1)} />;
  }

  const name = me.displayName;
  const subtitle: Record<Exclude<Step, "story">, string> = {
    country: `Welcome, ${name}. This sets your currency and the rules that apply to you.`,
    goal: "Pick what fits now. Nothing here is locked in.",
    handle: "Friends will find you by it. Take your seat in the circle.",
    pin: "Six digits you'll use to approve moving money. Don't share it, not even with us.",
    confirm: "Enter the same six digits once more.",
  };

  function back() {
    setError(undefined);
    if (step === "confirm") {
      setAgain("");
      setPin("");
    }
    setAt(at - 1);
  }

  /** A save that was refused for being signed out sends the person to sign in; anything else is shown. */
  function failed(result: Awaited<ReturnType<typeof postJson>>): boolean {
    if (result.status === 401) {
      router.replace("/sign-in");
      return true;
    }
    setError(messageOf(result));
    return false;
  }

  async function saveProfile() {
    const result = await postJson("/api/me/profile", { country, goal }, "PUT");
    if (!result.ok) return failed(result);
    return true;
  }

  async function saveUsername() {
    const chosen = normalizeUsername(username);
    const result = await postJson("/api/me/username", { username: chosen }, "PUT");
    if (result.ok) return true;
    // Someone took it between the live check and now: stay here, and say so.
    if (result.status === 409) setRefused((names) => [...names, chosen]);
    else failed(result);
    return false;
  }

  async function savePin() {
    if (again !== pin) {
      setError("Those PINs didn't match. Choose your PIN again.");
      setPin("");
      setAgain("");
      setAt(steps.indexOf("pin"));
      return false;
    }
    const result = await postJson("/api/me/pin", { pin }, "PUT");
    // 409 means a PIN is already set (an earlier try got that far).
    if (result.ok || result.status === 409) return true;
    if (!failed(result)) {
      setPin("");
      setAgain("");
      setAt(steps.indexOf("pin"));
    }
    return false;
  }

  async function onContinue() {
    setError(undefined);
    if (step === "country" || step === "pin") return setAt(at + 1);

    setBusy(true);
    const saved =
      step === "goal"
        ? await saveProfile()
        : step === "handle"
          ? await saveUsername()
          : await savePin();
    setBusy(false);
    if (!saved) return;
    if (last) router.replace("/today");
    else setAt(at + 1);
  }

  const ready =
    (step === "country" && country) ||
    (step === "goal" && goal) ||
    (step === "handle" && (check.phase === "available" || check.phase === "error")) ||
    (step === "pin" && pin.length === 6) ||
    (step === "confirm" && again.length === 6);

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <ScreenHeader
        eyebrow={
          questions.length === 1 ? "One last thing" : `Step ${number + 1} of ${questions.length}`
        }
        title={TITLES[step]}
        subtitle={subtitle[step]}
        onBack={at > firstQuestion ? back : undefined}
      />
      <div className="flex flex-1 flex-col">
        {step === "country" && (
          <OptionCards label="Country" options={COUNTRIES} value={country} onChange={setCountry} />
        )}
        {step === "goal" && (
          <OptionCards label="Goal" options={GOALS} value={goal} onChange={setGoal} />
        )}
        {step === "handle" && (
          <HandlePicker
            displayName={name}
            photos={photos}
            value={username}
            onChange={setUsername}
            check={check}
          />
        )}
        {step === "pin" && <PinPad label="New PIN" value={pin} onChange={setPin} />}
        {step === "confirm" && <PinPad label="Confirm PIN" value={again} onChange={setAgain} />}
        {error && (
          <p role="alert" className="mt-5 text-center text-[15px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="mt-auto pt-6">
          <Button size="lg" block disabled={busy || !ready} onClick={() => void onContinue()}>
            {busy ? "One moment…" : last ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
    </main>
  );
}
