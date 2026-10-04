"use client";

import { Check, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { Failure } from "@/lib/api-send";
import type { Person, Relation } from "@/lib/friends-client";
import { useFriends } from "./FriendsFlow";
import { TierBadge } from "./FriendsFlow";

type Props = Readonly<{
  person: Pick<Person, "username" | "displayName" | "tier"> & {
    relation?: Relation;
    mutualFriends?: number;
  };
  href: string;
  /** A line under the name, such as who they know in common. */
  note?: ReactNode;
  /** Called with the new relationship after a button has done its work. */
  onRelation?: (relation: Relation) => void;
  onFail?: (failure: Failure) => void;
}>;

/** One person: who they are, how you are related, and the button that moves it one step along. */
export function PersonRow({ person, href, note, onRelation, onFail }: Props) {
  const gateway = useFriends();
  const [relation, setRelation] = useState<Relation>(person.relation ?? "none");
  const [busy, setBusy] = useState(false);

  async function act(
    run: () => Promise<{ ok: true; data: unknown } | { ok: false; failure: Failure }>,
    next: Relation,
  ) {
    setBusy(true);
    const result = await run();
    setBusy(false);
    if (!result.ok) return onFail?.(result.failure);
    const data = result.data as { relation?: Relation } | undefined;
    const now = data?.relation ?? next;
    setRelation(now);
    onRelation?.(now);
  }

  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-3 shadow-lift">
      <Link href={href} className="flex min-w-0 grow items-center gap-3">
        <Avatar size={44} />
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate text-[16px] leading-5 font-semibold">{person.displayName}</span>
          <span className="truncate text-[13px] text-ink-muted">@{person.username}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <TierBadge tier={person.tier} />
            {note && <span className="text-[12px] text-ink-muted">{note}</span>}
          </span>
        </span>
      </Link>
      {relation === "none" && (
        <Button
          variant="primary"
          disabled={busy}
          aria-label={`Add ${person.displayName}`}
          onClick={() => void act(() => gateway.request(person.username), "requested")}
        >
          <UserPlus aria-hidden className="size-4" />
          Add
        </Button>
      )}
      {relation === "requested" && (
        <Button
          variant="quiet"
          disabled={busy}
          aria-label={`Cancel your request to ${person.displayName}`}
          onClick={() => void act(() => gateway.cancel(person.username), "none")}
        >
          <Clock aria-hidden className="size-4" />
          Requested
        </Button>
      )}
      {relation === "incoming" && (
        <Button
          variant="money"
          disabled={busy}
          aria-label={`Accept ${person.displayName}`}
          onClick={() => void act(() => gateway.accept(person.username), "friend")}
        >
          Accept
        </Button>
      )}
      {relation === "friend" && (
        <span className="inline-flex items-center gap-1 px-2 text-[13px] font-semibold text-leaf">
          <Check aria-hidden className="size-4" />
          Friends
        </span>
      )}
    </li>
  );
}
