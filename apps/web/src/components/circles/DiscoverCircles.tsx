"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { DiscoveredGroup } from "@/lib/groups-client";
import { CircleCard } from "./CirclesHome";
import { useCircles, useCirclesLock } from "./CirclesFlow";

/** Public circles that are still open, the ones with your friends in them first. */
export function DiscoverCircles() {
  const { preview, href, locale } = useMoneyFlow();
  const gateway = useCircles();
  const router = useRouter();
  const lock = useCirclesLock();
  const [found, setFound] = useState<readonly DiscoveredGroup[] | "failed">();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.discover();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setFound("failed");
      }
      setFound(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Find a circle" path="/circles/discover" />;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/circles" />}
      <ScreenHeader
        title="Find a circle"
        subtitle="Open circles, with your friends' circles first."
        backHref={href("/circles")}
      />
      {found === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {found === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load circles. Check your connection and try again.
          </p>
          <Button onClick={() => (setFound(undefined), setAttempt((n) => n + 1))}>Try again</Button>
        </div>
      )}
      {Array.isArray(found) && found.length === 0 && (
        <p className="text-[15px] leading-6 text-ink-muted">
          No open circles right now. Start your own, and invite your friends.
        </p>
      )}
      {Array.isArray(found) && found.length > 0 && (
        <ul aria-label="Open circles" className="grid gap-3">
          {found.map((g) => (
            <CircleCard
              key={g.id}
              group={g}
              href={href(`/circles/${g.id}`)}
              locale={locale}
              note={
                g.friendsIn > 0
                  ? `${g.friendsIn} ${g.friendsIn === 1 ? "friend is" : "friends are"} in this circle`
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </main>
  );
}
