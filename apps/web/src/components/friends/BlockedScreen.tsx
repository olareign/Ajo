"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Blocked } from "@/lib/friends-client";
import { useFriends, useFriendsLock } from "./FriendsFlow";

/** The people you have blocked, and a way to undo it. */
export function BlockedScreen() {
  const { preview, href } = useMoneyFlow();
  const gateway = useFriends();
  const router = useRouter();
  const lock = useFriendsLock();
  const [list, setList] = useState<readonly Blocked[] | "failed">();
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.blocks();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setList("failed");
      }
      setList(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Blocked" path="/friends/blocked" />;

  async function unblock(username: string) {
    setError(undefined);
    setBusy(username);
    const result = await gateway.unblock(username);
    setBusy(undefined);
    if (!result.ok) {
      if (result.failure.kind === "signed-out") return router.replace("/sign-in");
      return setError(result.failure.message);
    }
    setList((l) => (Array.isArray(l) ? l.filter((b) => b.username !== username) : l));
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/friends" />}
      <ScreenHeader
        title="Blocked people"
        subtitle="They can't find you or ask to be friends."
        backHref={href("/friends")}
      />
      {list === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {list === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load this. Check your connection and try again.
          </p>
          <Button onClick={() => (setList(undefined), setAttempt((n) => n + 1))}>Try again</Button>
        </div>
      )}
      {Array.isArray(list) && (
        <div className="grid gap-4">
          {error && (
            <p role="alert" className="text-center text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          {list.length === 0 ? (
            <p className="text-[15px] text-ink-muted">You haven&apos;t blocked anyone.</p>
          ) : (
            <ul className="grid gap-3">
              {list.map((b) => (
                <li
                  key={b.username}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift"
                >
                  <span className="grid min-w-0">
                    <span className="truncate font-semibold">{b.displayName}</span>
                    <span className="truncate text-[13px] text-ink-muted">@{b.username}</span>
                  </span>
                  <Button
                    variant="quiet"
                    disabled={busy === b.username}
                    aria-label={`Unblock ${b.displayName}`}
                    onClick={() => void unblock(b.username)}
                  >
                    Unblock
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
