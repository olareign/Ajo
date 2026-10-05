"use client";

import { Link2, Search, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleRing } from "@/components/CircleRing";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Initials } from "@/components/ui/Initials";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Friend, Requests, Suggestion } from "@/lib/friends-client";
import { dayText } from "@/lib/schedule";
import { TierBadge, useFriends, useFriendsLock } from "./FriendsFlow";
import { PersonRow } from "./PersonRow";

type Loaded = Readonly<{
  friends: readonly Friend[];
  requests: Requests;
  suggestions: readonly Suggestion[];
}>;

const REASON: Record<Suggestion["reason"], string> = {
  mutual: "",
  invited_you: "Invited you to Àjọ",
  you_invited: "You invited them",
};

/** Your circle of friends, drawn as a ring, with what needs you (requests) and who you may know. */
export function FriendsHome() {
  const { preview, href } = useMoneyFlow();
  const gateway = useFriends();
  const router = useRouter();
  const lock = useFriendsLock();
  const [data, setData] = useState<Loaded | "failed">();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      // One after another: the session's refresh token is single-use.
      const friends = await gateway.friends();
      if (!live) return;
      if (!friends.ok) {
        if (friends.failure.kind === "signed-out") return router.replace("/sign-in");
        return setData("failed");
      }
      const requests = await gateway.requests();
      if (!live) return;
      const suggestions = await gateway.suggestions();
      if (!live) return;
      if (!requests.ok || !suggestions.ok) return setData("failed");
      setData({ friends: friends.data, requests: requests.data, suggestions: suggestions.data });
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Friends" path="/friends" />;

  const incoming = data && data !== "failed" ? data.requests.incoming.length : 0;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/friends" />}
      <ScreenHeader
        title="Friends"
        subtitle="The people you'll save with."
        backHref={href("/today")}
      />

      {data === undefined && (
        <p role="status" className="text-ink-muted">
          Loading…
        </p>
      )}
      {data === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-ink-muted">
            We couldn&apos;t load your friends. Check your connection and try again.
          </p>
          <Button
            onClick={() => {
              setData(undefined);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {data && data !== "failed" && (
        <div className="grid gap-6">
          <section
            aria-label="Your circle"
            className="grid justify-items-center gap-3 rounded-[var(--radius-xl)] bg-surface-raised p-5 shadow-lift"
          >
            <CircleRing
              members={data.friends
                .slice(0, 12)
                .map((f) => ({ name: f.displayName, status: "paid" as const }))}
              center={{
                label: data.friends.length === 1 ? "friend" : "friends",
                value: String(data.friends.length),
              }}
              title="Your circle of friends"
              size={190}
            />
            {data.friends.length === 0 && (
              <p className="text-center text-[15px] leading-6 text-ink-muted">
                Your circle is empty. Find people you trust, or send them your invite link.
              </p>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <ButtonLink href={href("/friends/find")} size="lg">
              <Search aria-hidden className="size-5" />
              Find people
            </ButtonLink>
            <ButtonLink href={href("/friends/invite")} size="lg" variant="quiet">
              <Link2 aria-hidden className="size-5" />
              Invite
            </ButtonLink>
          </div>

          {error && (
            <p role="alert" className="text-center text-[15px] font-medium text-danger">
              {error}
            </p>
          )}

          {(incoming > 0 || data.requests.outgoing.length > 0) && (
            <Link
              href={href("/friends/requests")}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-l)] border border-oro/30 bg-oro-tint p-4 text-oro-ink"
            >
              <span className="flex items-center gap-3 text-[15px] font-semibold">
                <UserRoundCheck aria-hidden className="size-6" />
                {incoming > 0
                  ? `${incoming} ${incoming === 1 ? "request is" : "requests are"} waiting for you`
                  : `${data.requests.outgoing.length} sent, waiting for an answer`}
              </span>
              <span aria-hidden>›</span>
            </Link>
          )}

          {data.suggestions.length > 0 && (
            <section aria-labelledby="may-know" className="grid gap-3">
              <h2 id="may-know" className="font-display text-[18px] leading-6 font-semibold">
                People you may know
              </h2>
              <ul className="grid gap-3">
                {data.suggestions.map((s) => (
                  <PersonRow
                    key={s.username}
                    person={s}
                    href={href(`/friends/${s.username}`)}
                    note={
                      s.reason === "mutual"
                        ? `${s.mutualFriends} in common${s.mutualNames.length ? `: ${s.mutualNames.join(", ")}` : ""}`
                        : REASON[s.reason]
                    }
                    onFail={(f) =>
                      setError(f.kind === "signed-out" ? "Please sign in again." : f.message)
                    }
                  />
                ))}
              </ul>
            </section>
          )}

          {data.friends.length > 0 && (
            <section aria-labelledby="your-friends" className="grid gap-3">
              <h2 id="your-friends" className="font-display text-[18px] leading-6 font-semibold">
                Your friends
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
                {data.friends.map((f) => (
                  <li key={f.username}>
                    <Link
                      href={href(`/friends/${f.username}`)}
                      className="flex items-center gap-3 p-3 hover:bg-surface-sunken"
                    >
                      <Initials name={f.displayName} />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-[16px] leading-5 font-semibold">
                          {f.displayName}
                        </span>
                        <span className="truncate text-[13px] text-ink-muted">@{f.username}</span>
                        <span className="text-[12px] text-ink-muted">
                          Friends since {dayText(f.since.slice(0, 10))}
                        </span>
                      </span>
                      <span className="ml-auto grid shrink-0 justify-items-end gap-1">
                        <TierBadge tier={f.tier} />
                        <TrustBadge level={f.trust.level} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
