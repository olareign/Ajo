"use client";

import { MapPin, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { TextField } from "@/components/ui/TextField";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Person } from "@/lib/friends-client";
import { useFriends, useFriendsLock } from "./FriendsFlow";
import { PersonRow } from "./PersonRow";

export const SEARCH_DELAY_MS = 350;
const USERNAME_START = /^[a-z][a-z0-9_]{2,19}$/;

/** Search for a verified person by the start of their username. Nothing is listed until three letters are typed. */
export function FindPeople() {
  const { preview, href } = useMoneyFlow();
  const gateway = useFriends();
  const router = useRouter();
  const lock = useFriendsLock();
  const [text, setText] = useState("");
  const [found, setFound] = useState<readonly Person[]>();
  const [failed, setFailed] = useState<string>();
  const query = text.trim().replace(/^@/, "").toLowerCase();
  const ready = USERNAME_START.test(query);

  useEffect(() => {
    if (lock || !ready) return;
    let live = true;
    // Wait for a pause in typing, so each letter is not a request.
    const timer = setTimeout(async () => {
      const result = await gateway.search(query);
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        setFailed(result.failure.message);
        return setFound(undefined);
      }
      setFailed(undefined);
      setFound(result.data);
    }, SEARCH_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [gateway, query, ready, lock, router]);

  if (lock) return <FlowLocked lock={lock} title="Find people" path="/friends/find" />;

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      {preview && <PreviewRibbon exitHref="/friends" />}
      <ScreenHeader
        title="Find people"
        subtitle="Type the start of their username."
        backHref={href("/friends")}
      />
      <div className="grid gap-6">
        <TextField
          label="Username"
          prefix="@"
          value={text}
          onChange={setText}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          hint={
            preview
              ? "Try chidi, sade or emeka."
              : "Only people who have verified their identity can be found."
          }
        />

        {failed && (
          <p role="alert" className="text-[15px] text-danger">
            {failed}
          </p>
        )}
        {!ready && text.trim() !== "" && (
          <p className="text-[14px] text-ink-muted">Keep typing: at least 3 letters.</p>
        )}
        {ready && found && found.length === 0 && (
          <p role="status" className="text-[15px] text-ink-muted">
            No one found with a username starting &ldquo;{query}&rdquo;. Check the spelling, or send
            them your invite link.
          </p>
        )}
        {ready && found && found.length > 0 && (
          <ul aria-label="Results" className="grid gap-3">
            {found.map((p) => (
              <PersonRow
                key={p.username}
                person={p}
                href={href(`/friends/${p.username}`)}
                note={p.mutualFriends > 0 ? `${p.mutualFriends} in common` : undefined}
                onFail={(f) =>
                  setFailed(f.kind === "signed-out" ? "Please sign in again." : f.message)
                }
              />
            ))}
          </ul>
        )}

        <section
          aria-label="Coming later"
          className="grid gap-3 border-t-2 border-dashed border-line pt-6"
        >
          <p className="text-[13px] font-semibold tracking-[0.04em] text-ink-muted">COMING LATER</p>
          <div className="flex items-start gap-3 rounded-[var(--radius-l)] bg-surface-sunken p-4 text-[14px] leading-5">
            <Smartphone aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            <span>
              <span className="font-semibold">Find friends in your contacts.</span> It needs a
              verified phone number, which we can&apos;t check yet. Nothing from your contacts is
              ever read until then.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-[var(--radius-l)] bg-surface-sunken p-4 text-[14px] leading-5">
            <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            <span>
              <span className="font-semibold">People nearby.</span> It needs your verified location,
              and will only ever show an area name, never where you are.
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
