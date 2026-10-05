"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { Button } from "@/components/ui/Button";
import { countryConfig, type Country } from "@/lib/kyc-config";
import { loadRails, type Rails } from "@/lib/kyc-client";
import { forgetAll, recall, remember } from "@/lib/visit-cache";
import { ScreenSkeleton } from "@/components/ui/ScreenSkeleton";

export type Lock = "soon" | "kyc" | null;
type Capability = keyof Rails["connected"];

type Value = Readonly<{
  me: Me;
  preview: boolean;
  country: Country;
  currency: "NGN" | "GBP";
  locale: string;
  rails: Rails;
  href: (path: string) => string;
  /** Why a money action is closed to this person today, if it is. A preview is never closed. */
  lock: (capability: Capability) => Lock;
}>;

const Context = createContext<Value | null>(null);

export function useMoneyFlow(): Value {
  const value = useContext(Context);
  if (!value) throw new Error("useMoneyFlow must be used inside <MoneyFlow>");
  return value;
}

/**
 * Shared by every money screen under /wallet: who the person is, their currency, and which payment
 * actions are connected. With `?preview=1` everything is open and nothing is real; otherwise the
 * API says what is connected and whether the person is approved.
 */
export function MoneyFlow({ children }: Readonly<{ children: ReactNode }>) {
  return <MeGate needs="onboarded">{(me) => <Loader me={me}>{children}</Loader>}</MeGate>;
}

function Loader({ me, children }: Readonly<{ me: Me; children: ReactNode }>) {
  const router = useRouter();
  const preview = useSearchParams().get("preview") === "1";
  const config = countryConfig(me.country);
  // What is connected rarely changes within a visit: show the last answer at once, refresh behind.
  const [live, setLive] = useState<Rails | "failed" | undefined>(() => recall<Rails>("rails"));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (preview) return;
    let current = true;
    (async () => {
      const result = await loadRails();
      if (!current) return;
      if (result.status === "signed-out") {
        forgetAll();
        return router.replace("/sign-in");
      }
      if (result.status === "ok") remember("rails", result.data);
      setLive((was) =>
        result.status === "ok" ? result.data : was && was !== "failed" ? was : "failed",
      );
    })();
    return () => {
      current = false;
    };
  }, [preview, attempt, router]);

  const value = useMemo((): Value | null => {
    if (!config || (me.country !== "NG" && me.country !== "GB")) return null;
    const country: Country = me.country;
    const rails: Rails | null = preview
      ? {
          country,
          currency: config.currency,
          kycApproved: true,
          connected: { fund: true, mandate: true, withdraw: true },
        }
      : live === undefined || live === "failed"
        ? null
        : live;
    if (!rails) return null;
    return {
      me,
      preview,
      country,
      currency: config.currency,
      locale: config.locale,
      rails,
      href: (path) => (preview ? `${path}${path.includes("?") ? "&" : "?"}preview=1` : path),
      lock: (capability) =>
        preview ? null : !rails.connected[capability] ? "soon" : !rails.kycApproved ? "kyc" : null,
    };
  }, [preview, live, me, config]);

  if (live === "failed" && !preview) {
    return (
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-10">
        <p role="alert" className="text-ink-muted">
          We couldn&apos;t load this. Check your connection and try again.
        </p>
        <Button
          onClick={() => {
            setLive(undefined);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </main>
    );
  }
  if (!value) return <ScreenSkeleton />;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
