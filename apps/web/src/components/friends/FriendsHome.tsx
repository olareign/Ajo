"use client";

import { LayoutGrid, Link2, List, Search, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SummaryBand, ViewSwitch } from "@/components/desk/Band";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Pager } from "@/components/ui/Pager";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { PreviewRibbon } from "@/components/ui/PreviewRibbon";
import { FlowLocked } from "@/components/wallet/FlowLocked";
import { useMoneyFlow } from "@/components/wallet/MoneyFlow";
import type { Failure } from "@/lib/api-send";
import type { Friend, Requests, Suggestion } from "@/lib/friends-client";
import { usePaged } from "@/lib/paging";
import { dayText } from "@/lib/schedule";
import { recall, remember } from "@/lib/visit-cache";
import { TierBadge, useFriends, useFriendsLock } from "./FriendsFlow";
import { PersonRow } from "./PersonRow";
import { PAGE } from "@/lib/page";

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
  // Within a visit the last copy shows at once while a fresh one loads (never in a preview).
  const cacheKey = preview ? null : "screen:friends";
  const [data, setData] = useState<Loaded | "failed" | undefined>(() =>
    cacheKey ? recall<Loaded>(cacheKey) : undefined,
  );
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (lock) return;
    let live = true;
    (async () => {
      // Friends, requests and suggestions come in one request.
      const result = await gateway.home();
      if (!live) return;
      if (!result.ok) {
        if (result.failure.kind === "signed-out") return router.replace("/sign-in");
        return setData((was) => (was && was !== "failed" ? was : "failed"));
      }
      if (cacheKey) remember(cacheKey, result.data);
      setData(result.data);
    })();
    return () => {
      live = false;
    };
  }, [gateway, lock, router, attempt, cacheKey]);

  if (lock) return <FlowLocked lock={lock} title="Friends" path="/friends" />;

  const incoming = data && data !== "failed" ? data.requests.incoming.length : 0;

  return (
    <main className={PAGE}>
      {preview && <PreviewRibbon exitHref="/friends" />}
      <ScreenHeader
        title="Friends"
        subtitle="The people you'll save with."
        backHref={href("/today")}
        action={
          <div className="hidden gap-3 md:flex">
            <ButtonLink
              href={href("/friends/invite")}
              size="lg"
              variant="quiet"
              className="whitespace-nowrap"
            >
              <Link2 aria-hidden className="size-5" />
              Invite someone you trust
            </ButtonLink>
            <ButtonLink href={href("/friends/find")} size="lg" className="whitespace-nowrap">
              <Search aria-hidden className="size-5" />
              Find people
            </ButtonLink>
          </div>
        }
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
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            <ButtonLink
              href={href("/friends/invite")}
              size="lg"
              variant="quiet"
              className="whitespace-nowrap"
            >
              <Link2 aria-hidden className="size-5" />
              Invite someone you trust
            </ButtonLink>
            <ButtonLink href={href("/friends/find")} size="lg" className="whitespace-nowrap">
              <Search aria-hidden className="size-5" />
              Find people
            </ButtonLink>
          </div>

          {error && (
            <p role="alert" className="text-[15px] font-medium text-danger">
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

          <FriendBand friends={data.friends} incoming={incoming} />

          <section
            aria-labelledby="your-friends"
            className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift"
          >
            <h2
              id="your-friends"
              className="px-5 pt-5 pb-1 font-display text-[20px] leading-7 font-bold md:px-6"
            >
              Your friends
            </h2>
            <FriendList friends={data.friends} href={href} />
          </section>

          {data.suggestions.length > 0 && (
            <Suggestions
              suggestions={data.suggestions}
              href={href}
              onFail={(f) =>
                setError(f.kind === "signed-out" ? "Please sign in again." : f.message)
              }
            />
          )}
        </div>
      )}
    </main>
  );
}

/** Friends, how many are trusted, and the requests waiting: real counts, in the green band. */
function FriendBand({
  friends,
  incoming,
}: Readonly<{ friends: readonly Friend[]; incoming: number }>) {
  const trusted = friends.filter((f) => f.trust.level === "trusted").length;
  return (
    <SummaryBand
      label="Your friends at a glance"
      figures={[
        {
          label: "Friends",
          value: friends.length,
          note:
            friends.length === 0 ? "Find people you trust" : "People you can start a circle with",
        },
        {
          label: "Trusted",
          value: trusted,
          note: friends.length > 0 ? `${trusted} of ${friends.length}` : undefined,
        },
        {
          label: "Waiting for you",
          value: incoming,
          note: incoming === 1 ? "request" : "requests",
        },
      ]}
    />
  );
}

type Show = "all" | "plus" | "trusted" | "building";
type Sort = "newest" | "oldest" | "name";

const SHOW: Record<Show, string> = {
  all: "All friends",
  plus: "Verified +",
  trusted: "Trusted",
  building: "Still building trust",
};
const SORT: Record<Sort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name, A to Z",
};

const fitsShow = (f: Friend, show: Show) =>
  show === "all" ||
  (show === "plus" && f.tier === 2) ||
  (show === "trusted" && f.trust.level === "trusted") ||
  (show === "building" && f.trust.level !== "trusted");

/** Search, show, sort and the list/grid choice over your friends, then a page at a time. */
export function filterFriends(
  friends: readonly Friend[],
  query: string,
  show: Show,
  sort: Sort,
): readonly Friend[] {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  return friends
    .filter(
      (f) =>
        fitsShow(f, show) &&
        (q === "" ||
          f.displayName.toLowerCase().includes(q) ||
          f.username.toLowerCase().includes(q)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.displayName.localeCompare(b.displayName)
        : sort === "oldest"
          ? a.since.localeCompare(b.since)
          : b.since.localeCompare(a.since),
    );
}

function FriendList({
  friends,
  href,
}: Readonly<{ friends: readonly Friend[]; href: (path: string) => string }>) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const shown = filterFriends(friends, query, show, sort);
  const paged = usePaged(shown);
  const narrowed = query.trim() !== "" || show !== "all";

  if (friends.length === 0) {
    return (
      <p className="p-5 text-ink-muted md:p-6">
        People you add show up here. Find someone you trust, or send your invite link.
      </p>
    );
  }

  return (
    <>
      <div
        role="search"
        aria-label="Search your friends"
        className="grid grid-cols-2 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_200px_180px_auto] md:items-end md:p-6"
      >
        <label className="col-span-2 grid gap-1.5 text-[13px] font-semibold md:col-span-1">
          Search your friends
          <span className="flex h-12 items-center gap-2 rounded-[14px] border border-line-strong bg-surface px-3 focus-within:border-primary">
            <Search aria-hidden className="size-4 shrink-0 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => (setQuery(e.target.value), paged.setPage(1))}
              placeholder="Name or @username"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-normal outline-none"
            />
          </span>
        </label>
        <label className="grid gap-1.5 text-[13px] font-semibold">
          Show
          <select
            value={show}
            onChange={(e) => (setShow(e.target.value as Show), paged.setPage(1))}
            className="h-12 rounded-[14px] border border-line-strong bg-surface px-3 text-[15px] font-normal"
          >
            {Object.entries(SHOW).map(([id, word]) => (
              <option key={id} value={id}>
                {word}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-[13px] font-semibold">
          Sort
          <select
            value={sort}
            onChange={(e) => (setSort(e.target.value as Sort), paged.setPage(1))}
            className="h-12 rounded-[14px] border border-line-strong bg-surface px-3 text-[15px] font-normal"
          >
            {Object.entries(SORT).map(([id, word]) => (
              <option key={id} value={id}>
                {word}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 md:col-span-1">
          <ViewSwitch
            label="Layout"
            value={view}
            onChange={setView}
            options={[
              { id: "grid", label: "Grid", icon: <LayoutGrid aria-hidden className="size-5" /> },
              { id: "list", label: "List", icon: <List aria-hidden className="size-5" /> },
            ]}
          />
        </div>
      </div>

      {paged.total === 0 ? (
        <div className="grid justify-items-start gap-3 border-t border-line p-5 md:p-6">
          <p className="text-ink-muted">
            {narrowed ? "No friends match that." : "No friends yet."}
          </p>
          {narrowed && (
            <Button
              variant="quiet"
              onClick={() => {
                setQuery("");
                setShow("all");
              }}
            >
              Clear the search
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <ul className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 md:p-6 lg:grid-cols-3 2xl:grid-cols-4">
          {paged.slice.map((f) => (
            <li key={f.username}>
              <Link
                href={href(`/friends/${f.username}`)}
                className="grid h-full justify-items-center gap-2 rounded-[var(--radius-l)] border border-line p-5 text-center hover:bg-surface-sunken"
              >
                <PersonPhoto
                  username={f.username}
                  version={f.photoVersion}
                  name={f.displayName}
                  standIn="initials"
                  size={64}
                />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-[16px] leading-5 font-semibold">
                    {f.displayName}
                  </span>
                  <span className="truncate text-[13px] text-ink-muted">@{f.username}</span>
                </span>
                <span className="flex flex-wrap justify-center gap-1.5">
                  <TierBadge tier={f.tier} />
                  <TrustBadge level={f.trust.level} />
                </span>
                <span className="text-[12px] text-ink-muted">
                  Friends since {dayText(f.since.slice(0, 10))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {paged.slice.map((f) => (
            <li key={f.username}>
              <Link
                href={href(`/friends/${f.username}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken md:px-6"
              >
                <PersonPhoto
                  username={f.username}
                  version={f.photoVersion}
                  name={f.displayName}
                  standIn="initials"
                />
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
      )}
      <Pager paged={paged} noun={["friend", "friends"]} className="border-t border-line" />
    </>
  );
}

/** People you may know, a page at a time, each with the button that adds them. */
function Suggestions({
  suggestions,
  href,
  onFail,
}: Readonly<{
  suggestions: readonly Suggestion[];
  href: (path: string) => string;
  onFail: (failure: Failure) => void;
}>) {
  const paged = usePaged(suggestions);
  return (
    <section
      aria-labelledby="may-know"
      className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift"
    >
      <h2
        id="may-know"
        className="px-5 pt-5 pb-1 font-display text-[20px] leading-7 font-bold md:px-6"
      >
        People you may know
      </h2>
      <ul className="grid gap-3 p-4 md:p-6 xl:grid-cols-2">
        {paged.slice.map((s) => (
          <PersonRow
            key={s.username}
            person={s}
            href={href(`/friends/${s.username}`)}
            note={
              s.reason === "mutual"
                ? `${s.mutualFriends} in common${s.mutualNames.length ? `: ${s.mutualNames.join(", ")}` : ""}`
                : REASON[s.reason]
            }
            onFail={onFail}
          />
        ))}
      </ul>
      <Pager paged={paged} noun={["person", "people"]} className="border-t border-line" />
    </section>
  );
}
