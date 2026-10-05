"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { messageOf } from "@/components/auth/post-json";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { signedOut } from "@/components/security/MfaSetup";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { loadEmailChoices, saveEmailChoice, type EmailChoices } from "@/lib/profile-client";

export function EmailChoicesScreen() {
  return <MeGate needs="onboarded">{() => <Choices />}</MeGate>;
}

const ROWS: readonly { key: keyof EmailChoices; label: string; hint: string }[] = [
  {
    key: "reminders",
    label: "Reminders",
    hint: "A day before a saving or circle payment is taken",
  },
  { key: "savings", label: "Saving plans", hint: "A plan started, finished or paused" },
  { key: "circles", label: "Circles", hint: "Invites, the draw and who joined" },
  { key: "friends", label: "Friends", hint: "Friend requests and answers" },
];

/**
 * Which emails a person wants. Each switch saves as it is flipped and goes back if it couldn't.
 * Money and account emails aren't listed: they always go, because they protect the person.
 */
function Choices() {
  const router = useRouter();
  const [choices, setChoices] = useState<EmailChoices | "failed">();
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState<keyof EmailChoices>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await loadEmailChoices();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setChoices("failed");
      }
      setChoices(result.data);
    })();
    return () => {
      live = false;
    };
  }, [router, attempt]);

  async function flip(current: EmailChoices, key: keyof EmailChoices) {
    const on = !current[key];
    setError(undefined);
    setSaving(key);
    setChoices({ ...current, [key]: on });
    const result = await saveEmailChoice({ [key]: on });
    setSaving(undefined);
    if (result.ok) return;
    if (signedOut(result)) return router.replace("/sign-in");
    setChoices(current);
    setError(messageOf(result));
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title="Notifications"
        subtitle="Choose which emails you get. Everything still shows in Messages."
        backHref="/me"
      />
      {choices === undefined && (
        <div role="status" className="grid gap-3">
          <span className="sr-only">Loading…</span>
          <div
            aria-hidden
            className="h-64 animate-pulse rounded-[var(--radius-l)] bg-surface-sunken"
          />
        </div>
      )}
      {choices === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your choices. Check your connection and try again.
          </p>
          <Button onClick={() => (setChoices(undefined), setAttempt((n) => n + 1))}>
            Try again
          </Button>
        </div>
      )}
      {choices !== undefined && choices !== "failed" && (
        <div className="grid gap-4">
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
            {ROWS.map(({ key, label, hint }) => {
              const on = choices[key];
              return (
                <li key={key} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="grid min-w-0 flex-1">
                    <span id={`email-${key}`} className="text-[15px] font-semibold">
                      {label}
                    </span>
                    <span className="text-[13px] text-ink-muted">{hint}</span>
                  </span>
                  {saving === key && (
                    <span className="text-[14px] text-ink-muted">
                      <Spinner />
                    </span>
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-labelledby={`email-${key}`}
                    disabled={saving !== undefined}
                    onClick={() => void flip(choices, key)}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60",
                      on ? "bg-primary" : "bg-ink-muted/40",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-0.5 left-0.5 size-6 rounded-full bg-surface-raised shadow-lift transition-transform",
                        on && "translate-x-5",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          {error && (
            <p role="alert" className="text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          <p className="flex gap-3 rounded-[var(--radius-l)] bg-surface-sunken p-4 text-[14px] leading-5 text-ink-muted">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
            Emails about your money (payments taken, missed or paid out) and your account&apos;s
            safety always come. They protect you, so they can&apos;t be turned off.
          </p>
        </div>
      )}
    </main>
  );
}
