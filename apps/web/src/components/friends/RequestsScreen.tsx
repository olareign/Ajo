"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Failure } from "@/lib/api-send";
import type { FriendRequest, Requests } from "@/lib/friends-client";
import { TierBadge, useFriends, useFriendsLock } from "./FriendsFlow";

/** Requests to you, to answer, and requests from you, to take back. */
export function RequestsScreen() {
  const { preview, href } = useMoneyFlow();
  const gateway = useFriends();
  const router = useRouter();
  const lock = useFriendsLock();
  const [requests, setRequests] = useState<Requests | "failed">();
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.requests();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setRequests("failed");
      }
      setRequests(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Requests" path="/friends/requests" />;

  async function act(
    username: string,
    run: () => Promise<{ ok: true } | { ok: false; failure: Failure }>,
  ) {
    setError(undefined);
    setBusy(username);
    const result = await run();
    setBusy(undefined);
    if (!result.ok) {
      if (result.failure.kind === "signed-out") return router.replace("/sign-in");
      return setError(result.failure.message);
    }
    setRequests((r) =>
      r === "failed" || r === undefined
        ? r
        : {
            incoming: r.incoming.filter((x) => x.username !== username),
            outgoing: r.outgoing.filter((x) => x.username !== username),
          },
    );
  }

  const row = (r: FriendRequest, actions: React.ReactNode) => (
    <li
      key={r.username}
      className="flex items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-3 shadow-lift"
    >
      <Avatar size={44} />
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate text-[16px] leading-5 font-semibold">{r.displayName}</span>
        <span className="truncate text-[13px] text-ink-muted">@{r.username}</span>
        <TierBadge tier={r.tier} />
      </span>
      <span className="ml-auto flex shrink-0 gap-2">{actions}</span>
    </li>
  );

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/friends" />}
      <ScreenHeader title="Requests" backHref={href("/friends")} />
      {requests === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {requests === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your requests. Check your connection and try again.
          </p>
          <Button onClick={() => (setRequests(undefined), setAttempt((n) => n + 1))}>
            Try again
          </Button>
        </div>
      )}
      {requests && requests !== "failed" && (
        <div className="grid gap-8">
          {error && (
            <p role="alert" className="text-center text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          <section aria-labelledby="to-you" className="grid gap-3">
            <h2 id="to-you" className="font-display text-[20px] leading-7 font-semibold">
              Waiting for you
            </h2>
            {requests.incoming.length === 0 ? (
              <p className="text-[15px] text-ink-muted">No one is waiting for an answer.</p>
            ) : (
              <ul className="grid gap-3">
                {requests.incoming.map((r) =>
                  row(
                    r,
                    <>
                      <Button
                        variant="quiet"
                        disabled={busy === r.username}
                        aria-label={`Decline ${r.displayName}`}
                        onClick={() =>
                          void act(
                            r.username,
                            () => gateway.decline(r.username) as Promise<{ ok: true }>,
                          )
                        }
                      >
                        Not now
                      </Button>
                      <Button
                        variant="money"
                        disabled={busy === r.username}
                        aria-label={`Accept ${r.displayName}`}
                        onClick={() =>
                          void act(
                            r.username,
                            () => gateway.accept(r.username) as Promise<{ ok: true }>,
                          )
                        }
                      >
                        Accept
                      </Button>
                    </>,
                  ),
                )}
              </ul>
            )}
          </section>
          <section aria-labelledby="from-you" className="grid gap-3">
            <h2 id="from-you" className="font-display text-[20px] leading-7 font-semibold">
              Sent by you
            </h2>
            {requests.outgoing.length === 0 ? (
              <p className="text-[15px] text-ink-muted">You haven&apos;t any requests waiting.</p>
            ) : (
              <ul className="grid gap-3">
                {requests.outgoing.map((r) =>
                  row(
                    r,
                    <Button
                      variant="quiet"
                      disabled={busy === r.username}
                      aria-label={`Cancel your request to ${r.displayName}`}
                      onClick={() =>
                        void act(
                          r.username,
                          () => gateway.cancel(r.username) as Promise<{ ok: true }>,
                        )
                      }
                    >
                      Cancel
                    </Button>,
                  ),
                )}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
