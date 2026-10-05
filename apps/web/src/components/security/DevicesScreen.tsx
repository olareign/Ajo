"use client";

import { KeyRound, Laptop, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import type { Failure } from "@/lib/api-send";
import {
  forgetDevice,
  loadSessions,
  loadTrustedDevices,
  signOutDevice,
  type Session,
  type TrustedDevice,
} from "@/lib/security-client";
import { whenText } from "@/lib/when";

export function DevicesScreen() {
  return <MeGate needs="onboarded">{() => <Devices />}</MeGate>;
}

const isPhone = (device: string) => /Android|iPhone|iPad/i.test(device);

/** Every device signed in now, and every device remembered for the second step; each can be ended. */
function Devices() {
  const router = useRouter();
  const [sessions, setSessions] = useState<readonly Session[] | "failed">();
  const [trusted, setTrusted] = useState<readonly TrustedDevice[]>([]);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const [s, t] = await Promise.all([loadSessions(), loadTrustedDevices()]);
      if (!live) return;
      if (!s.ok) {
        if (s.failure.kind === "signed-out") return router.replace("/sign-in");
        return setSessions("failed");
      }
      setSessions(s.data);
      if (t.ok) setTrusted(t.data);
    })();
    return () => {
      live = false;
    };
  }, [router, attempt]);

  function fail(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    setError(failure.message);
  }

  async function signOut(id: string) {
    setError(undefined);
    setBusy(id);
    const result = await signOutDevice(id);
    setBusy(undefined);
    if (!result.ok) return fail(result.failure);
    setSessions((list) => (Array.isArray(list) ? list.filter((s) => s.id !== id) : list));
  }

  async function forget(id: string) {
    setError(undefined);
    setBusy(id);
    const result = await forgetDevice(id);
    setBusy(undefined);
    if (!result.ok) return fail(result.failure);
    setTrusted((list) => list.filter((d) => d.id !== id));
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader
        title="Devices"
        subtitle="Where you're signed in. Sign out anything you don't recognise."
        backHref="/me"
      />
      {sessions === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {sessions === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your devices. Check your connection and try again.
          </p>
          <Button onClick={() => (setSessions(undefined), setAttempt((n) => n + 1))}>
            Try again
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mb-4 text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
      {Array.isArray(sessions) && (
        <div className="grid gap-6">
          <section aria-labelledby="signed-in" className="grid gap-3">
            <h2 id="signed-in" className="font-display text-[18px] leading-6 font-semibold">
              Signed in
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
              {sessions.map((s) => {
                const Icon = isPhone(s.device) ? Smartphone : Laptop;
                return (
                  <li key={s.id} className="flex items-center gap-3 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="grid min-w-0 grow">
                      <span className="flex items-center gap-2 text-[15px] font-semibold">
                        <span className="truncate">{s.device}</span>
                        {s.current && (
                          <span className="shrink-0 rounded-full bg-leaf-tint px-2 py-0.5 text-[11px] font-semibold text-leaf">
                            This device
                          </span>
                        )}
                      </span>
                      <span className="text-[13px] text-ink-muted">
                        Last used {whenText(s.lastSeenAt)}
                        {s.ip ? ` · ${s.ip}` : ""}
                      </span>
                    </span>
                    {!s.current && (
                      <Button
                        variant="quiet"
                        loading={busy === s.id}
                        disabled={busy !== undefined}
                        onClick={() => void signOut(s.id)}
                        aria-label={`Sign out ${s.device}`}
                      >
                        Sign out
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="remembered" className="grid gap-3">
            <h2 id="remembered" className="font-display text-[18px] leading-6 font-semibold">
              Remembered for the second step
            </h2>
            {trusted.length === 0 ? (
              <p className="text-[15px] text-ink-muted">
                None. Every new sign-in asks for your authenticator code.
              </p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
                {trusted.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-oro-tint text-oro-ink">
                      <KeyRound aria-hidden className="size-5" />
                    </span>
                    <span className="grid min-w-0 grow">
                      <span className="truncate text-[15px] font-semibold">{d.device}</span>
                      <span className="text-[13px] text-ink-muted">
                        Last used {whenText(d.lastUsedAt)}
                      </span>
                    </span>
                    <Button
                      variant="quiet"
                      loading={busy === d.id}
                      disabled={busy !== undefined}
                      onClick={() => void forget(d.id)}
                      aria-label={`Forget ${d.device}`}
                    >
                      Forget
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-[13px] leading-5 text-ink-muted">
            Lost a phone? Sign out of all devices from Me, then change your password.
          </p>
        </div>
      )}
    </main>
  );
}
