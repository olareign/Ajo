"use client";

import { Ban, Flag, UserMinus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Failure } from "@/lib/api-send";
import type { Person, ReportReason } from "@/lib/friends-client";
import { TierBadge, useFriends, useFriendsLock } from "./FriendsFlow";

type Panel = "block" | "report" | "remove" | null;

const REASONS: readonly { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "fake_account", label: "Fake account" },
  { value: "scam", label: "Scam" },
  { value: "other", label: "Something else" },
];

/** One person: who they are, what you have in common, and everything you can do about them. */
export function PersonScreen({ username }: Readonly<{ username: string }>) {
  const { preview, href } = useMoneyFlow();
  const gateway = useFriends();
  const router = useRouter();
  const lock = useFriendsLock();
  const [person, setPerson] = useState<Person | "missing" | "failed">();
  const [attempt, setAttempt] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      const result = await gateway.person(username);
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setPerson(
          result.failure.kind === "refused" && result.failure.status === 404 ? "missing" : "failed",
        );
      }
      setPerson(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, username, lock, router, attempt]);

  if (lock) return <FlowLocked lock={lock} title="Friends" path={`/friends/${username}`} />;

  if (person === undefined) {
    return (
      <p role="status" className="mx-auto max-w-md px-4 pt-10 text-ink-muted">
        Loading…
      </p>
    );
  }
  if (person === "missing" || person === "failed") {
    return (
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pt-10">
        <p role="alert" className="text-ink-muted">
          {person === "missing"
            ? "We couldn't find that person."
            : "We couldn't load this. Check your connection and try again."}
        </p>
        {person === "failed" ? (
          <Button onClick={() => (setPerson(undefined), setAttempt((n) => n + 1))}>
            Try again
          </Button>
        ) : (
          <ButtonLink href={href("/friends")}>Back to friends</ButtonLink>
        )}
      </main>
    );
  }

  const shown: Person = person;

  function problem(failure: Failure) {
    if (failure.kind === "signed-out") return router.replace("/sign-in");
    setError(failure.message);
  }
  async function run(
    work: () => Promise<{ ok: true; data: unknown } | { ok: false; failure: Failure }>,
    then: (data: unknown) => void,
  ) {
    setError(undefined);
    setBusy(true);
    const result = await work();
    setBusy(false);
    if (!result.ok) return problem(result.failure);
    then(result.data);
    setPanel(null);
  }
  const setRelation = (relation: Person["relation"]) => setPerson({ ...shown, relation });

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/friends" />}
      <ScreenHeader title={shown.displayName} backHref={href("/friends")} />

      <section
        aria-label="About"
        className="grid justify-items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-6 text-center shadow-lift"
      >
        <PersonPhoto
          username={shown.username}
          version={shown.photoVersion}
          name={shown.displayName}
          size={96}
        />
        <div className="grid gap-1">
          <p className="text-[15px] text-ink-muted">@{shown.username}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <TierBadge tier={shown.tier} />
            <TrustBadge level={shown.trust.level} />
          </div>
        </div>
        <p className="flex items-center gap-2 text-[14px] text-ink-muted">
          <Users aria-hidden className="size-4" />
          {shown.mutualFriends === 0
            ? "No friends in common yet"
            : `${shown.mutualFriends} ${shown.mutualFriends === 1 ? "friend" : "friends"} in common`}
        </p>
      </section>

      {note && (
        <p
          role="status"
          className="mt-4 rounded-[var(--radius-l)] bg-leaf-tint p-4 text-[15px] text-leaf"
        >
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-center text-[15px] font-medium text-danger">
          {error}
        </p>
      )}

      <section aria-label="What you can do" className="mt-6 grid gap-3">
        {panel === null && (
          <>
            {shown.relation === "none" && (
              <Button
                size="lg"
                loading={busy}
                disabled={busy}
                onClick={() =>
                  void run(
                    () => gateway.request(shown.username),
                    (d) => setRelation((d as { relation: Person["relation"] }).relation),
                  )
                }
              >
                Add as a friend
              </Button>
            )}
            {shown.relation === "requested" && (
              <Button
                size="lg"
                variant="quiet"
                loading={busy}
                disabled={busy}
                onClick={() =>
                  void run(
                    () => gateway.cancel(shown.username),
                    () => setRelation("none"),
                  )
                }
              >
                Cancel your request
              </Button>
            )}
            {shown.relation === "incoming" && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  variant="money"
                  loading={busy}
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => gateway.accept(shown.username),
                      () => setRelation("friend"),
                    )
                  }
                >
                  Accept
                </Button>
                <Button
                  size="lg"
                  variant="quiet"
                  loading={busy}
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => gateway.decline(shown.username),
                      () => setRelation("none"),
                    )
                  }
                >
                  Not now
                </Button>
              </div>
            )}
            {shown.relation === "friend" && (
              <>
                <p className="text-center text-[15px] font-semibold text-leaf">
                  You&apos;re friends.
                </p>
                <Button variant="quiet" onClick={() => (setError(undefined), setPanel("remove"))}>
                  <UserMinus aria-hidden className="size-5" />
                  Remove from friends
                </Button>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="quiet" onClick={() => (setError(undefined), setPanel("report"))}>
                <Flag aria-hidden className="size-4" />
                Report
              </Button>
              <Button variant="danger" onClick={() => (setError(undefined), setPanel("block"))}>
                <Ban aria-hidden className="size-4" />
                Block
              </Button>
            </div>
          </>
        )}

        {panel === "remove" && (
          <div className="grid gap-4 rounded-[var(--radius-l)] bg-surface-sunken p-4">
            <p className="text-[15px] leading-6">
              Remove {shown.displayName} from your friends? They won&apos;t be told, and either of
              you can ask again.
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Button variant="quiet" onClick={() => setPanel(null)}>
                Keep
              </Button>
              <Button
                variant="danger"
                loading={busy}
                disabled={busy}
                onClick={() =>
                  void run(
                    () => gateway.remove(shown.username),
                    () => setRelation("none"),
                  )
                }
              >
                Remove
              </Button>
            </div>
          </div>
        )}

        {panel === "block" && (
          <div className="grid gap-4 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4">
            <p className="text-[15px] leading-6">
              Block {shown.displayName}? You&apos;ll disappear from each other: no searching, no
              requests, and any friendship ends. They won&apos;t be told. You can unblock them any
              time.
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Button variant="quiet" onClick={() => setPanel(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={busy}
                disabled={busy}
                onClick={() =>
                  void run(
                    () => gateway.block(shown.username),
                    () => router.push(href("/friends")),
                  )
                }
              >
                Block
              </Button>
            </div>
          </div>
        )}

        {panel === "report" && (
          <div className="grid gap-4 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift">
            <ChoiceChips
              label="What's wrong?"
              options={REASONS}
              value={reason}
              onChange={(v) => setReason(v as ReportReason)}
            />
            <p className="text-[13px] leading-5 text-ink-muted">
              Our team reads every report. They are not told who sent it.
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Button variant="quiet" onClick={() => setPanel(null)}>
                Cancel
              </Button>
              <Button
                loading={busy}
                disabled={!reason || busy}
                onClick={() =>
                  void run(
                    () => gateway.report(shown.username, reason!),
                    () => (setReason(null), setNote("Thank you. We'll look into it.")),
                  )
                }
              >
                Send report
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
