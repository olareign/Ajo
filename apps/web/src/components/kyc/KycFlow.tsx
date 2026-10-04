"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MeGate, type Me } from "@/components/onboarding/MeGate";
import { Button } from "@/components/ui/Button";
import {
  emptyKyc,
  previewState,
  settle,
  type KycState,
  type PreviewKind,
  type StepKey,
  type StepStatus,
} from "@/lib/kyc";
import { loadKyc } from "@/lib/kyc-client";
import type { Country } from "@/lib/kyc-config";

type Value = Readonly<{
  me: Me;
  preview: boolean;
  state: KycState;
  /** A link that stays in the preview if the person is in it. */
  href: (path: string) => string;
  /** Preview only: decide a step. With real data the partner decides, so this does nothing. */
  settle: (step: StepKey, status: Exclude<StepStatus, "not_started">, reason?: string) => void;
  showOutcome: (kind: PreviewKind) => void;
}>;

const Context = createContext<Value | null>(null);

export function useKycFlow(): Value {
  const value = useContext(Context);
  if (!value) throw new Error("useKycFlow must be used inside <KycFlow>");
  return value;
}

const STORE = "ajo.preview.kyc";

/** A preview survives a refresh within the tab, and is forgotten when the tab closes. */
function readPreview(country: Country | null): KycState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null") as KycState | null;
    if (saved && saved.country === country && Array.isArray(saved.steps)) return saved;
  } catch {
    // Blocked or corrupt storage: start the preview afresh.
  }
  return emptyKyc(country, true);
}
function writePreview(state: KycState) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    // The preview still works for this page view.
  }
}

const asCountry = (value: string | null | undefined): Country | null =>
  value === "NG" || value === "GB" ? value : null;

/**
 * Holds one person's verification progress for every screen under /verify. With `?preview=1` it is a
 * made-up walk-through kept in this tab only; otherwise it is the API's answer. The signed-in gate
 * comes first, so nothing shows to someone who is signed out or has not finished setup.
 */
export function KycFlow({ children }: Readonly<{ children: ReactNode }>) {
  return <MeGate needs="onboarded">{(me) => <Loader me={me}>{children}</Loader>}</MeGate>;
}

function Loader({ me, children }: Readonly<{ me: Me; children: ReactNode }>) {
  const router = useRouter();
  const preview = useSearchParams().get("preview") === "1";
  const country = asCountry(me.country);
  const [sample, setSample] = useState<KycState>(() => readPreview(country));
  const [live, setLive] = useState<KycState | "failed">();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (preview) return;
    let current = true;
    (async () => {
      const result = await loadKyc();
      if (!current) return;
      if (result.status === "signed-out") return router.replace("/sign-in");
      setLive(result.status === "ok" ? result.data : "failed");
    })();
    return () => {
      current = false;
    };
  }, [preview, attempt, router]);

  const update = useCallback((next: KycState) => {
    setSample(next);
    writePreview(next);
  }, []);

  const value = useMemo((): Value | null => {
    const state = preview ? sample : live === "failed" || live === undefined ? null : live;
    if (!state) return null;
    return {
      me,
      preview,
      state,
      href: (path) => (preview ? `${path}${path.includes("?") ? "&" : "?"}preview=1` : path),
      settle: (step, status, reason) => {
        if (preview) update(settle(sample, step, status, reason ?? null));
      },
      showOutcome: (kind) => {
        if (preview) update(previewState(kind, country));
      },
    };
  }, [preview, sample, live, me, update, country]);

  if (live === "failed" && !preview) {
    return (
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-10">
        <p role="alert" className="text-ink-muted">
          We couldn&apos;t load your verification. Check your connection and try again.
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
  if (!value) {
    return (
      <p role="status" className="mx-auto max-w-md px-4 pt-10 text-ink-muted">
        Loading…
      </p>
    );
  }
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
