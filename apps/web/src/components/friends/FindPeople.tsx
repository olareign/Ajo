"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Pager } from "@/components/ui/Pager";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { TextField } from "@/components/ui/TextField";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Person } from "@/lib/friends-client";
import { useFriends, useFriendsLock } from "./FriendsFlow";
import { PersonRow } from "./PersonRow";
import { usePaged } from "@/lib/paging";
import { PAGE } from "@/lib/page";

export const SEARCH_DELAY_MS = 350;
const USERNAME_START = /^[a-z][a-z0-9_]{2,19}$/;

type Show = "all" | "new" | "common";
type Sort = "best" | "name";

/** Narrows and orders what the search found. "Best match" is the order the API gave. */
export function arrange(found: readonly Person[], show: Show, sort: Sort): readonly Person[] {
  const kept = found.filter(
    (p) =>
      show === "all" ||
      (show === "new" && p.relation === "none") ||
      (show === "common" && p.mutualFriends > 0),
  );
  return sort === "name"
    ? kept.slice().sort((a, b) => a.displayName.localeCompare(b.displayName))
    : kept;
}

const field =
  "h-[52px] rounded-[14px] border border-line-strong bg-surface px-3 text-[15px] font-normal text-ink";

/** Search for a verified person by the start of their username. Nothing is listed until three letters are typed. */
export function FindPeople() {
  const { preview, href } = useMoneyFlow();
  const gateway = useFriends();
  const router = useRouter();
  const lock = useFriendsLock();
  const [text, setText] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [sort, setSort] = useState<Sort>("best");
  const [found, setFound] = useState<readonly Person[]>();
  const [failed, setFailed] = useState<string>();
  const query = text.trim().replace(/^@/, "").toLowerCase();
  const ready = USERNAME_START.test(query);
  const shown = found ? arrange(found, show, sort) : [];
  const paged = usePaged(shown);

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
    <main className={PAGE}>
      {preview && <PreviewRibbon exitHref="/friends" />}
      <ScreenHeader
        title="Find people"
        subtitle="Type the start of their username. Only people who have verified their identity can be found."
        backHref={href("/friends")}
        action={
          <ButtonLink
            href={href("/friends/invite")}
            variant="quiet"
            size="lg"
            className="hidden whitespace-nowrap md:inline-flex"
          >
            <Link2 aria-hidden className="size-5" />
            Invite instead
          </ButtonLink>
        }
      />
      <div className="grid gap-6">
        <div
          role="search"
          aria-label="Find people"
          className="grid gap-4 rounded-[var(--radius-xl)] bg-surface-raised p-4 shadow-lift md:grid-cols-[minmax(0,1fr)_220px_200px] md:items-end md:p-6"
        >
          <TextField
            label="Username"
            prefix="@"
            value={text}
            onChange={(value) => (setText(value), paged.setPage(1))}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            hint={
              preview
                ? "Try chidi, sade or emeka."
                : "Only people who have verified their identity can be found."
            }
          />
          <label className="grid gap-1.5 text-[13px] font-semibold text-ink-muted">
            Show
            <select
              value={show}
              onChange={(e) => (setShow(e.target.value as Show), paged.setPage(1))}
              className={field}
            >
              <option value="all">Everyone found</option>
              <option value="new">Not yet friends</option>
              <option value="common">Friends in common</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-[13px] font-semibold text-ink-muted">
            Sort
            <select
              value={sort}
              onChange={(e) => (setSort(e.target.value as Sort), paged.setPage(1))}
              className={field}
            >
              <option value="best">Best match</option>
              <option value="name">Name, A to Z</option>
            </select>
          </label>
        </div>

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
            No one found with a username starting &ldquo;{query}&rdquo;. Check the spelling, or{" "}
            <Link
              href={href("/friends/invite")}
              className="font-semibold text-primary underline underline-offset-4"
            >
              send them your invite link
            </Link>
            .
          </p>
        )}
        {ready && found && found.length > 0 && (
          <section aria-labelledby="found" className="grid gap-4">
            <h2 id="found" className="text-[15px] font-semibold text-ink-muted" aria-live="polite">
              {shown.length} {shown.length === 1 ? "person" : "people"} starting &ldquo;{query}
              &rdquo;
            </h2>
            {shown.length === 0 ? (
              <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-ink-muted">
                No one fits that filter. Try &ldquo;Everyone found&rdquo;.
              </p>
            ) : (
              <div className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift">
                <ul
                  aria-label="Results"
                  className="grid gap-4 p-4 sm:grid-cols-2 md:p-6 xl:grid-cols-3"
                >
                  {paged.slice.map((p) => (
                    <PersonRow
                      key={p.username}
                      variant="card"
                      person={p}
                      href={href(`/friends/${p.username}`)}
                      note={p.mutualFriends > 0 ? `${p.mutualFriends} in common` : undefined}
                      onFail={(f) =>
                        setFailed(f.kind === "signed-out" ? "Please sign in again." : f.message)
                      }
                    />
                  ))}
                </ul>
                <Pager paged={paged} noun={["person", "people"]} className="border-t border-line" />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
