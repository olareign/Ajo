import type { Failure, Outcome } from "./api-send";
import * as live from "./friends-client";
import type {
  Blocked,
  Friend,
  FriendRequest,
  Invite,
  Person,
  Relation,
  ReportReason,
  Requests,
  Suggestion,
  Trust,
} from "./friends-client";

/** What the friends screens ask for: the server, or in a preview a pretend one that lives in this tab. */
export type FriendsGateway = Readonly<{
  friends: () => Promise<Outcome<readonly Friend[]>>;
  requests: () => Promise<Outcome<Requests>>;
  suggestions: () => Promise<Outcome<readonly Suggestion[]>>;
  search: (q: string) => Promise<Outcome<readonly Person[]>>;
  person: (username: string) => Promise<Outcome<Person>>;
  blocks: () => Promise<Outcome<readonly Blocked[]>>;
  invite: () => Promise<Outcome<Invite>>;
  request: (username: string) => Promise<Outcome<{ relation: Relation }>>;
  accept: (username: string) => Promise<Outcome<{ relation: Relation }>>;
  decline: (username: string) => Promise<Outcome<unknown>>;
  cancel: (username: string) => Promise<Outcome<unknown>>;
  remove: (username: string) => Promise<Outcome<unknown>>;
  block: (username: string) => Promise<Outcome<unknown>>;
  unblock: (username: string) => Promise<Outcome<unknown>>;
  report: (username: string, reason: ReportReason, details?: string) => Promise<Outcome<unknown>>;
}>;

export const liveFriends: FriendsGateway = {
  friends: live.loadFriends,
  requests: live.loadRequests,
  suggestions: live.loadSuggestions,
  search: live.searchPeople,
  person: live.loadPerson,
  blocks: live.loadBlocks,
  invite: live.loadInvite,
  request: live.sendRequest,
  accept: live.acceptRequest,
  decline: live.declineRequest,
  cancel: live.cancelRequest,
  remove: live.removeFriend,
  block: live.blockPerson,
  unblock: live.unblockPerson,
  report: live.reportPerson,
};

// ---- the pretend server -------------------------------------------------------------------------

type Pretend = {
  username: string;
  displayName: string;
  tier: 1 | 2;
  relation: Relation;
  blocked: boolean;
  knows: string[];
  trust: Trust;
};

const SAMPLE: readonly Pretend[] = [
  {
    username: "chidi_o",
    trust: { level: "trusted", score: 85 },
    displayName: "Chidi Okafor",
    tier: 2,
    relation: "friend",
    blocked: false,
    knows: [],
  },
  {
    username: "funmi_a",
    trust: { level: "trusted", score: 60 },
    displayName: "Funmi Adeyemi",
    tier: 1,
    relation: "friend",
    blocked: false,
    knows: [],
  },
  {
    username: "tunde_b",
    trust: { level: "building", score: 25 },
    displayName: "Tunde Bakare",
    tier: 1,
    relation: "incoming",
    blocked: false,
    knows: [],
  },
  {
    username: "ngozi_e",
    trust: { level: "trusted", score: 45 },
    displayName: "Ngozi Eze",
    tier: 1,
    relation: "none",
    blocked: false,
    knows: ["Chidi Okafor", "Funmi Adeyemi"],
  },
  {
    username: "kemi_s",
    trust: { level: "new", score: 0 },
    displayName: "Kemi Salako",
    tier: 2,
    relation: "none",
    blocked: false,
    knows: ["Funmi Adeyemi"],
  },
  {
    username: "sade_k",
    trust: { level: "building", score: 15 },
    displayName: "Sade Kehinde",
    tier: 1,
    relation: "none",
    blocked: false,
    knows: [],
  },
  {
    username: "emeka_o",
    trust: { level: "new", score: 0 },
    displayName: "Emeka Obi",
    tier: 1,
    relation: "none",
    blocked: false,
    knows: [],
  },
];

const ok = <T>(data: T): Outcome<T> => ({ ok: true, data });
const missing = (): Outcome<never> => ({
  ok: false,
  failure: {
    kind: "refused",
    status: 404,
    code: "person_not_found",
    message: "We couldn't find that person.",
  } satisfies Failure,
});

/** A pretend server for walking the friends screens: nothing is sent, and it is gone when the tab is. */
export function previewFriends(): FriendsGateway {
  const people: Pretend[] = SAMPLE.map((p) => ({ ...p, knows: [...p.knows] }));
  const find = (username: string) =>
    people.find((p) => p.username === username.replace(/^@/, "").toLowerCase());
  const visible = () => people.filter((p) => !p.blocked);
  const mutual = (p: Pretend) => p.knows.length;
  const person = (p: Pretend): Person => ({
    username: p.username,
    displayName: p.displayName,
    trust: p.trust,
    relation: p.relation,
    mutualFriends: mutual(p),
    tier: p.tier,
  });
  const when = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const set = (username: string, relation: Relation) => {
    const p = find(username);
    if (!p || p.blocked) return missing();
    p.relation = relation;
    return ok({ relation });
  };

  return {
    friends: async () =>
      ok(
        visible()
          .filter((p) => p.relation === "friend")
          .map((p, i): Friend => ({
            username: p.username,
            displayName: p.displayName,
            since: when(10 + i * 7),
            tier: p.tier,
            trust: p.trust,
          })),
      ),
    requests: async () => {
      const row = (p: Pretend): FriendRequest => ({
        username: p.username,
        displayName: p.displayName,
        sentAt: when(1),
        tier: p.tier,
      });
      return ok({
        incoming: visible()
          .filter((p) => p.relation === "incoming")
          .map(row),
        outgoing: visible()
          .filter((p) => p.relation === "requested")
          .map(row),
      });
    },
    suggestions: async () =>
      ok(
        visible()
          .filter((p) => p.relation === "none" && mutual(p) > 0)
          .sort((a, b) => mutual(b) - mutual(a))
          .map((p): Suggestion => ({
            ...person(p),
            reason: "mutual",
            mutualNames: p.knows.slice(0, 2),
          })),
      ),
    search: async (q) => {
      const start = q.trim().replace(/^@/, "").toLowerCase();
      return ok(
        visible()
          .filter((p) => p.username.startsWith(start))
          .sort(
            (a, b) =>
              Number(b.username === start) - Number(a.username === start) ||
              a.username.localeCompare(b.username),
          )
          .map(person),
      );
    },
    person: async (username) => {
      const p = find(username);
      return p && !p.blocked ? ok(person(p)) : missing();
    },
    blocks: async () =>
      ok(
        people
          .filter((p) => p.blocked)
          .map((p): Blocked => ({
            username: p.username,
            displayName: p.displayName,
            blockedAt: when(0),
          })),
      ),
    invite: async () => ok({ code: "PREVIEW1", link: "https://ajo.example/join/PREVIEW1" }),
    request: async (username) => {
      const p = find(username);
      if (!p || p.blocked) return missing();
      if (p.relation === "incoming") return set(username, "friend");
      if (p.relation === "friend") return ok({ relation: "friend" as const });
      return set(username, "requested");
    },
    accept: async (username) =>
      find(username)?.relation === "incoming" ? set(username, "friend") : missing(),
    decline: async (username) => (set(username, "none"), ok({})),
    cancel: async (username) => (set(username, "none"), ok({})),
    remove: async (username) => (set(username, "none"), ok({})),
    block: async (username) => {
      const p = find(username);
      if (!p) return missing();
      p.blocked = true;
      p.relation = "none";
      return ok({});
    },
    unblock: async (username) => {
      const p = find(username);
      if (p) p.blocked = false;
      return ok({});
    },
    report: async (username) => (find(username) ? ok({}) : missing()),
  };
}
