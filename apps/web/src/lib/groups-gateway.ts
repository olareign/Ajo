import type { Failure, Outcome } from "./api-send";
import * as live from "./groups-client";
import type {
  CircleMember,
  ContributionStatus,
  DiscoveredGroup,
  DrawView,
  GroupDetail,
  GroupInput,
  GroupPreview,
  GroupStatus,
  GroupSummary,
  RoundView,
  Swap,
  Trust,
} from "./groups-client";
import { addDays, scheduleDates, todayIn } from "./schedule";

/** What the circle screens ask for: the server, or in a preview a pretend one that lives in this tab. */
export type GroupsGateway = Readonly<{
  list: () => Promise<Outcome<readonly GroupSummary[]>>;
  discover: () => Promise<Outcome<readonly DiscoveredGroup[]>>;
  get: (id: string) => Promise<Outcome<GroupDetail>>;
  byCode: (code: string) => Promise<Outcome<GroupSummary>>;
  preview: (input: GroupInput) => Promise<Outcome<live.GroupPreview>>;
  create: (input: GroupInput, key: string) => Promise<Outcome<GroupDetail>>;
  joinByCode: (code: string) => Promise<Outcome<GroupDetail>>;
  joinPublic: (id: string) => Promise<Outcome<GroupDetail>>;
  leave: (id: string) => Promise<Outcome<GroupSummary>>;
  cancel: (id: string) => Promise<Outcome<GroupDetail>>;
  invite: (id: string, username: string) => Promise<Outcome<unknown>>;
  pick: (id: string, spot: number) => Promise<Outcome<GroupDetail>>;
  swaps: (id: string) => Promise<Outcome<readonly Swap[]>>;
  proposeSwap: (id: string, username: string) => Promise<Outcome<GroupDetail>>;
  answerSwap: (id: string, swapId: string, accept: boolean) => Promise<Outcome<GroupDetail>>;
  /** Preview only: have sample people join until the circle is full. */
  fillWithSamples?: (id: string) => Promise<Outcome<GroupDetail>>;
  /** Preview only: collect the next round and pay it out. */
  nextRound?: (id: string) => Promise<Outcome<GroupDetail>>;
}>;

export const liveGroups: GroupsGateway = {
  list: live.loadGroups,
  discover: live.loadDiscover,
  get: live.loadGroup,
  byCode: live.loadGroupByCode,
  preview: live.previewGroup,
  create: live.createGroup,
  joinByCode: live.joinByCode,
  joinPublic: live.joinPublic,
  leave: live.leaveGroup,
  cancel: live.cancelGroup,
  invite: live.inviteToGroup,
  pick: live.pickSpot,
  swaps: live.loadSwaps,
  proposeSwap: live.proposeSwap,
  answerSwap: live.answerSwap,
};

// ---- the pretend server -------------------------------------------------------------------------

const PEOPLE: readonly { username: string; displayName: string; trust: Trust }[] = [
  { username: "chidi_o", displayName: "Chidi Okafor", trust: { level: "trusted", score: 85 } },
  { username: "funmi_a", displayName: "Funmi Adeyemi", trust: { level: "trusted", score: 60 } },
  { username: "tunde_b", displayName: "Tunde Bakare", trust: { level: "building", score: 25 } },
  { username: "ngozi_e", displayName: "Ngozi Eze", trust: { level: "trusted", score: 45 } },
  { username: "kemi_s", displayName: "Kemi Salako", trust: { level: "new", score: 0 } },
  { username: "sade_k", displayName: "Sade Kehinde", trust: { level: "building", score: 15 } },
  { username: "emeka_o", displayName: "Emeka Obi", trust: { level: "trusted", score: 70 } },
  { username: "amaka_n", displayName: "Amaka Nwosu", trust: { level: "new", score: 0 } },
];

type PMember = {
  username: string;
  displayName: string;
  trust: Trust;
  spot: number | null;
  isYou: boolean;
};
type PRound = {
  due: string;
  recipient: string;
  status: RoundView["status"];
  payout: bigint | null;
  statuses: Record<string, ContributionStatus>;
};
type PGroup = {
  id: string;
  input: GroupInput;
  status: GroupStatus;
  currency: string;
  creator: string;
  code: string;
  members: PMember[];
  rounds: PRound[];
  draws: DrawView[];
  pickDeadline: string | null;
  discoverable: boolean;
};

const ok = <T>(data: T): Outcome<T> => ({ ok: true, data });
const no = (message: string, code?: string, status = 409): Outcome<never> => ({
  ok: false,
  failure: { kind: "refused", status, code, message } satisfies Failure,
});
const gone = () => no("We couldn't find that circle.", undefined, 404);

export const roundDates = (
  start: string,
  frequency: GroupInput["frequency"],
  size: number,
): string[] =>
  frequency === "biweekly"
    ? Array.from({ length: size }, (_, n) => addDays(start, 14 * n))
    : scheduleDates(start, frequency, size);

const randomSeed = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
const shuffled = <T>(items: readonly T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};

/** A pretend server for walking the circle screens: nothing is sent, and it is gone when the tab is. */
export function previewGroups(currency: string, displayName: string): GroupsGateway {
  const today = todayIn(currency);
  let counter = 0;
  const you: PMember = {
    username: "you",
    displayName,
    trust: { level: "building", score: 25 },
    spot: null,
    isYou: true,
  };
  const groups: PGroup[] = [];
  const who = (p: (typeof PEOPLE)[number]): PMember => ({ ...p, spot: null, isYou: false });

  const input = (over: Partial<GroupInput>): GroupInput => ({
    name: "Circle",
    contribution: currency === "GBP" ? "5000" : "1000000",
    frequency: "monthly",
    size: 6,
    startDate: addDays(today, 14),
    orderMethod: "random",
    visibility: "private",
    ...over,
  });

  const make = (over: Partial<PGroup> & { input: GroupInput; members: PMember[] }): PGroup => {
    counter += 1;
    const g: PGroup = {
      id: `preview-g${counter}`,
      status: "open",
      currency,
      creator: "you",
      code: `PREV${String(counter).padStart(4, "0")}`,
      rounds: [],
      draws: [],
      pickDeadline: null,
      discoverable: false,
      ...over,
    };
    groups.push(g);
    return g;
  };

  // A circle already under way, so there is something to look at; and some to discover.
  const sunday = make({
    input: input({
      name: "Sunday circle",
      community: "Church friends",
      size: 6,
      frequency: "monthly",
      startDate: addDays(today, -40),
      orderMethod: "random",
    }),
    members: [you, ...PEOPLE.slice(0, 5).map(who)].map((m, i) => ({
      ...m,
      spot: [4, 1, 2, 3, 5, 6][i]!,
    })),
    status: "running",
    creator: "chidi_o",
  });
  const dates = roundDates(sunday.input.startDate, sunday.input.frequency, sunday.input.size);
  const bySpot = (spot: number) => sunday.members.find((m) => m.spot === spot)!;
  const potOf = (g: PGroup) => BigInt(g.input.contribution) * BigInt(g.input.size);
  sunday.rounds = dates.map((due, i) => ({
    due,
    recipient: bySpot(i + 1).username,
    status: i < 2 ? "paid_out" : "scheduled",
    payout: i < 2 ? potOf(sunday) : null,
    statuses: Object.fromEntries(
      sunday.members.map((m, k) => [
        m.username,
        (i < 2
          ? "paid"
          : i === 2
            ? k === 2
              ? "scheduled"
              : k === 4
                ? "late"
                : "paid"
            : "scheduled") as ContributionStatus,
      ]),
    ),
  }));
  sunday.rounds[2]!.statuses["tunde_b"] = "covered";
  sunday.draws = [
    {
      kind: "random",
      seed: randomSeed(),
      createdAt: new Date().toISOString(),
      order: sunday.members
        .slice()
        .sort((a, b) => a.spot! - b.spot!)
        .map((m) => ({ spot: m.spot, username: m.username, displayName: m.displayName })),
    },
  ];

  for (const [name, size, joined, over] of [
    ["Market women's ajo", 8, 5, { community: "Balogun market" }],
    ["Office circle", 5, 2, { frequency: "weekly" as const }],
    ["New parents", 6, 3, {}],
  ] as const) {
    make({
      input: input({ name, size, visibility: "public", ...over }),
      members: PEOPLE.slice(0, joined).map(who),
      creator: PEOPLE[0]!.username,
      discoverable: true,
    });
  }

  // ---- views -------------------------------------------------------------------------------------

  const potText = (g: PGroup) => potOf(g).toString();
  const summary = (g: PGroup): GroupSummary => {
    const mine = g.members.find((m) => m.isYou);
    const creator =
      g.members.find((m) => m.username === g.creator) ??
      PEOPLE.map(who).find((p) => p.username === g.creator)!;
    return {
      id: g.id,
      name: g.input.name,
      community: g.input.community ?? null,
      status: g.status,
      currency: g.currency,
      contribution: g.input.contribution,
      frequency: g.input.frequency,
      size: g.input.size,
      memberCount: g.members.length,
      startDate: g.input.startDate,
      orderMethod: g.input.orderMethod,
      visibility: g.input.visibility,
      pot: potText(g),
      creator: {
        username: creator.isYou ? null : creator.username,
        displayName: creator.displayName,
      },
      isMember: Boolean(mine),
      isCreator: g.creator === "you",
      mySpot: mine?.spot ?? null,
      friendsIn: g.members.filter((m) => !m.isYou && ["chidi_o", "funmi_a"].includes(m.username))
        .length,
      inviteCode: mine ? g.code : null,
      rules: rulesOf(g),
    };
  };
  const money = (n: bigint | string) => ({ amount: n.toString(), currency });
  const detail = (g: PGroup): GroupDetail => {
    const base = summary(g);
    const mine = g.members.find((m) => m.isYou);
    if (!mine) {
      return {
        ...base,
        members: [],
        rounds: [],
        draws: [],
        myDeposit: null,
        pickDeadline: null,
        nextDue: null,
        graceDays: 2,
        rules: rulesOf(g),
      };
    }
    const nextIndex = g.rounds.findIndex((r) => r.status === "scheduled");
    const members: CircleMember[] = g.members
      .slice()
      .sort((a, b) => (a.spot ?? 1000) - (b.spot ?? 1000))
      .map((m) => ({
        username: m.isYou ? "you" : m.username,
        displayName: m.displayName,
        spot: m.spot,
        isYou: m.isYou,
        isCreator: m.username === g.creator,
        trust: m.trust,
        current: nextIndex >= 0 ? (g.rounds[nextIndex]!.statuses[m.username] ?? null) : null,
      }));
    const nameOf = (u: string) => g.members.find((m) => m.username === u)?.displayName ?? u;
    return {
      ...base,
      members,
      rounds: g.rounds.map((r, i) => ({
        roundNo: i + 1,
        dueOn: r.due,
        recipient: r.recipient,
        recipientName: nameOf(r.recipient),
        isYours: r.recipient === "you",
        status: r.status,
        payout: r.payout === null ? null : money(r.payout),
        fee: r.status === "scheduled" ? null : money(0n),
        paid: Object.values(r.statuses).filter((s) => ["paid", "late", "covered"].includes(s))
          .length,
        yours: r.statuses.you ?? null,
        board: g.members.map((m) => ({
          username: m.isYou ? "you" : m.username,
          displayName: m.displayName,
          status: r.statuses[m.username] ?? null,
        })),
      })),
      draws: g.draws,
      myDeposit: money(mine.trust.level === "trusted" ? 0n : BigInt(g.input.contribution)),
      pickDeadline: g.pickDeadline,
      nextDue: nextIndex >= 0 ? { roundNo: nextIndex + 1, dueOn: g.rounds[nextIndex]!.due } : null,
      graceDays: 2,
    };
  };
  const rulesOf = (g: PGroup) => ({
    deposit: money(g.input.contribution),
    earlyDeposit: money(BigInt(g.input.contribution) * 3n),
    earlySpots: Math.ceil(g.input.size / 3),
    feeBps: 0,
    lateFeeBps: 0,
    graceDays: 2,
  });
  const find = (id: string) => groups.find((g) => g.id === id);

  /** The circle fills: turns are set by joining order, a draw, or opened for picking. */
  function lock(g: PGroup) {
    if (g.input.orderMethod === "pick") {
      g.status = "picking";
      g.pickDeadline = new Date(Date.now() + 24 * 3_600_000).toISOString();
      return;
    }
    const order = g.input.orderMethod === "join_order" ? g.members : shuffled(g.members);
    order.forEach((m, i) => (m.spot = i + 1));
    if (g.input.orderMethod === "random") {
      g.draws = [
        {
          kind: "random",
          seed: randomSeed(),
          createdAt: new Date().toISOString(),
          order: order.map((m, i) => ({
            spot: i + 1,
            username: m.username,
            displayName: m.displayName,
          })),
        },
      ];
    }
    start(g);
  }
  function start(g: PGroup) {
    g.status = "running";
    g.pickDeadline = null;
    const dates = roundDates(g.input.startDate, g.input.frequency, g.input.size);
    const bySpot = new Map(g.members.map((m) => [m.spot, m]));
    g.rounds = dates.map((due, i) => ({
      due,
      recipient: bySpot.get(i + 1)!.username,
      status: "scheduled",
      payout: null,
      statuses: Object.fromEntries(
        g.members.map((m) => [m.username, "scheduled" as ContributionStatus]),
      ),
    }));
  }
  const addMember = (g: PGroup, m: PMember) => {
    g.members.push(m);
    if (g.members.length === g.input.size) lock(g);
  };

  const find2 = (code: string) => groups.find((g) => g.code === code.toUpperCase());

  return {
    list: async () => ok(groups.filter((g) => g.members.some((m) => m.isYou)).map(summary)),
    discover: async () =>
      ok(
        groups
          .filter((g) => g.discoverable && g.status === "open" && !g.members.some((m) => m.isYou))
          .map((g): DiscoveredGroup => ({ ...summary(g), score: 10 * summary(g).friendsIn })),
      ),
    get: async (id) => {
      const g = find(id);
      return g ? ok(detail(g)) : gone();
    },
    byCode: async (code) => {
      const g = find2(code);
      return g ? ok(summary(g)) : no("That invite isn't valid.", "invite_not_found", 404);
    },
    preview: async (i): Promise<Outcome<GroupPreview>> => {
      const c = BigInt(i.contribution);
      return ok({
        dates: roundDates(i.startDate, i.frequency, i.size),
        pot: money(c * BigInt(i.size)),
        fee: money(0n),
        deposit: money(c),
        earlyDeposit: money(c * 3n),
        earlySpots: Math.ceil(i.size / 3),
        graceDays: 2,
      });
    },
    create: async (i) => {
      const g = make({ input: i, members: [{ ...you, spot: null }] });
      return ok(detail(g));
    },
    joinByCode: async (code) => {
      const g = find2(code);
      if (!g) return no("That invite isn't valid.", "invite_not_found", 404);
      if (g.status !== "open") return no("This circle is no longer taking people.", "group_locked");
      if (!g.members.some((m) => m.isYou)) addMember(g, { ...you });
      return ok(detail(g));
    },
    joinPublic: async (id) => {
      const g = find(id);
      if (!g || g.input.visibility !== "public") return gone();
      if (g.status !== "open") return no("This circle is no longer taking people.", "group_locked");
      if (!g.members.some((m) => m.isYou)) addMember(g, { ...you });
      return ok(detail(g));
    },
    leave: async (id) => {
      const g = find(id);
      if (!g) return gone();
      if (g.status !== "open")
        return no("You can't leave once the circle is full.", "group_locked");
      if (g.creator === "you")
        return no(
          "You made this circle, so call it off instead of leaving.",
          "creator_cannot_leave",
        );
      g.members = g.members.filter((m) => !m.isYou);
      return ok(summary(g));
    },
    cancel: async (id) => {
      const g = find(id);
      if (!g) return gone();
      if (g.status !== "open")
        return no("A circle that is full can't be called off.", "group_locked");
      g.status = "cancelled";
      return ok(detail(g));
    },
    invite: async () => ok({}),
    pick: async (id, spot) => {
      const g = find(id);
      if (!g) return gone();
      if (g.status !== "picking")
        return no("Picking isn't open for this circle.", "picking_closed");
      const me = g.members.find((m) => m.isYou)!;
      if (me.spot !== null) return no("You've already picked your turn.", "already_picked");
      if (g.members.some((m) => m.spot === spot))
        return no("Someone just took that turn.", "spot_taken");
      me.spot = spot;
      // The others pick the turns that are left, then the rounds begin.
      const open = shuffled(
        Array.from({ length: g.input.size }, (_, i) => i + 1).filter(
          (s) => !g.members.some((m) => m.spot === s),
        ),
      );
      for (const m of g.members.filter((x) => x.spot === null)) m.spot = open.shift()!;
      start(g);
      return ok(detail(g));
    },
    swaps: async () => ok([]),
    proposeSwap: async () => no("Swapping isn't part of the preview.", "swap_unavailable"),
    answerSwap: async () => no("Swapping isn't part of the preview.", "swap_unavailable"),
    fillWithSamples: async (id) => {
      const g = find(id);
      if (!g) return gone();
      for (const p of PEOPLE) {
        if (g.status !== "open") break;
        if (!g.members.some((m) => m.username === p.username)) addMember(g, who(p));
      }
      return ok(detail(g));
    },
    nextRound: async (id) => {
      const g = find(id);
      if (!g) return gone();
      const i = g.rounds.findIndex((r) => r.status === "scheduled");
      if (g.status !== "running" || i < 0) return no("There's no round left to collect.", "none");
      const r = g.rounds[i]!;
      for (const m of g.members) r.statuses[m.username] = "paid";
      r.status = "paid_out";
      r.payout = potOf(g);
      if (g.rounds.every((x) => x.status !== "scheduled")) g.status = "completed";
      return ok(detail(g));
    },
  };
}
