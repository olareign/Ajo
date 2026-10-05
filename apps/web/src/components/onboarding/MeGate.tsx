"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ScreenSkeleton } from "@/components/ui/ScreenSkeleton";
import { forgetAll, recall, remember } from "@/lib/visit-cache";

export type Me = Readonly<{
  displayName: string;
  email: string;
  onboarded: boolean;
  /** What setup has saved so far, so it can pick up where the person stopped. */
  country?: string | null;
  goal?: string | null;
  username?: string | null;
  hasPin?: boolean;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  kycStatus?: "not_started" | "in_progress" | "pending" | "approved" | "rejected";
  kycTier?: 0 | 1 | 2;
}>;

type Props = Readonly<{
  /** Which side of onboarding this screen belongs to; the other side is redirected away. */
  needs: "onboarded" | "not-onboarded";
  children: (me: Me) => ReactNode;
}>;

const fits = (me: Me | undefined, needs: Props["needs"]) =>
  me !== undefined && me.onboarded === (needs === "onboarded");

/**
 * Asks our server who is signed in (it refreshes the session if needed) and sends the person
 * where they belong: sign-in without a session, onboarding until it is finished. Within a visit the
 * last answer is shown at once while a fresh one is fetched, so moving between screens never waits.
 */
export function MeGate({ needs, children }: Props) {
  const router = useRouter();
  const [me, setMe] = useState<Me | undefined>(() => {
    const known = recall<Me>("me");
    return fits(known, needs) ? known : undefined;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "same-origin" });
        if (!live) return;
        if (res.status === 401) {
          forgetAll();
          return router.replace("/sign-in");
        }
        if (!res.ok) return setFailed(true);
        const data = (await res.json()) as Me;
        remember("me", data);
        if (data.onboarded && needs === "not-onboarded") return router.replace("/today");
        if (!data.onboarded && needs === "onboarded") return router.replace("/onboarding");
        setMe(data);
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [needs, router]);

  if (failed) {
    return (
      <p role="alert" className="mx-auto max-w-md px-4 pt-10 text-ink-muted">
        We couldn&apos;t reach Àjọ. Check your connection and refresh.
      </p>
    );
  }
  if (!me) return <ScreenSkeleton />;
  return <>{children(me)}</>;
}
