import { DEFAULT_RULES, earlySpotCount, type GroupRules } from "./rules";

/**
 * Payout order methods (docs/product-spec.md, "Payout order methods"). Whatever the
 * method, early spots go to trusted members first; an untrusted member placed in an
 * early spot must lock a larger deposit.
 */
export type Member = Readonly<{ id: string; trusted: boolean; joinedAt: string }>;

export type SpotAssignment = Readonly<{
  memberId: string;
  spot: number;
  earlySpot: boolean;
  requiresEarlySpotDeposit: boolean;
}>;

function assign(ordered: readonly Member[], earlyCount: number): SpotAssignment[] {
  const trusted = ordered.filter((m) => m.trusted);
  const early = trusted.slice(0, earlyCount);
  const earlyIds = new Set(early.map((m) => m.id));
  const rest = ordered.filter((m) => !earlyIds.has(m.id));
  // Not enough trusted members: the earliest untrusted members fill the gap.
  const final = [...early, ...rest];
  return final.map((m, i) => ({
    memberId: m.id,
    spot: i + 1,
    earlySpot: i < earlyCount,
    requiresEarlySpotDeposit: i < earlyCount && !m.trusted,
  }));
}

function assertUniqueIds(members: readonly Member[]): void {
  if (new Set(members.map((m) => m.id)).size !== members.length) {
    throw new Error("Member list contains duplicate ids");
  }
}

/** Ids are unique (checked by every entry point), so ties never occur. */
function byId(a: Member, b: Member): number {
  return a.id < b.id ? -1 : 1;
}

export function joinOrder(
  members: readonly Member[],
  rules: GroupRules = DEFAULT_RULES,
): SpotAssignment[] {
  assertUniqueIds(members);
  const ordered = [...members].sort(
    (a, b) => Date.parse(a.joinedAt) - Date.parse(b.joinedAt) || byId(a, b),
  );
  return assign(ordered, earlySpotCount(members.length, rules));
}

// Web Crypto, available in browsers and Node; declared here to keep this package free of DOM and Node types.
declare const crypto: { getRandomValues<T extends Uint8Array>(array: T): T };

const SEED = /^[0-9a-f]{32}$/;

/** A fresh 128-bit seed from the platform's cryptographically secure generator. */
export function createDrawSeed(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Deterministic generator (sfc32) expanded from a 128-bit secure seed, so a draw can be
 * replayed and checked by anyone holding the logged seed. Returns integers in [0, n).
 */
export function seededRandom(seed: string): (n: number) => number {
  if (!SEED.test(seed)) {
    throw new Error("Draw seed must be 32 lowercase hex characters (128 bits)");
  }
  let [a, b, c, d] = [0, 8, 16, 24].map((i) => parseInt(seed.slice(i, i + 8), 16)) as [
    number,
    number,
    number,
    number,
  ];
  const next32 = (): number => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  return (n: number) => {
    if (!Number.isInteger(n) || n < 1 || n > 2 ** 32) {
      throw new Error(`Invalid random range: ${n}`);
    }
    // Rejection sampling avoids modulo bias.
    const limit = Math.floor(2 ** 32 / n) * n;
    let x = next32();
    while (x >= limit) x = next32();
    return x % n;
  };
}

function shuffle<T>(items: readonly T[], random: (n: number) => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export type Draw = Readonly<{ seed: string; assignments: SpotAssignment[] }>;

export function randomDraw(
  members: readonly Member[],
  seed: string,
  rules: GroupRules = DEFAULT_RULES,
): Draw {
  assertUniqueIds(members);
  // Sorting first makes the result depend only on the seed and the member set.
  const shuffled = shuffle([...members].sort(byId), seededRandom(seed));
  return { seed, assignments: assign(shuffled, earlySpotCount(members.length, rules)) };
}

export function verifyDraw(
  members: readonly Member[],
  seed: string,
  assignments: readonly SpotAssignment[],
  rules: GroupRules = DEFAULT_RULES,
): boolean {
  const expected = randomDraw(members, seed, rules).assignments;
  if (expected.length !== assignments.length) return false;
  const claimed = new Map(assignments.map((a) => [a.memberId, a.spot]));
  return expected.every((a) => claimed.get(a.memberId) === a.spot);
}

export type PickErrorCode =
  "spot_taken" | "already_picked" | "out_of_range" | "not_member" | "early_spot_reserved";

export class PickError extends Error {
  constructor(readonly code: PickErrorCode) {
    super(`Cannot pick spot: ${code}`);
    this.name = "PickError";
  }
}

export type PickingState = Readonly<{
  members: readonly Member[];
  earlyCount: number;
  /** spot number -> member id */
  picks: ReadonlyMap<number, string>;
}>;

export function openPicking(
  members: readonly Member[],
  rules: GroupRules = DEFAULT_RULES,
): PickingState {
  assertUniqueIds(members);
  return { members, earlyCount: earlySpotCount(members.length, rules), picks: new Map() };
}

export function pickSpot(state: PickingState, memberId: string, spot: number): PickingState {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) throw new PickError("not_member");
  if (!Number.isInteger(spot) || spot < 1 || spot > state.members.length) {
    throw new PickError("out_of_range");
  }
  if (state.picks.has(spot)) throw new PickError("spot_taken");
  const placed = new Set(state.picks.values());
  if (placed.has(memberId)) throw new PickError("already_picked");

  if (spot <= state.earlyCount && !member.trusted) {
    let openEarly = 0;
    for (let s = 1; s <= state.earlyCount; s++) if (!state.picks.has(s)) openEarly++;
    const trustedUnplaced = state.members.filter((m) => m.trusted && !placed.has(m.id)).length;
    if (trustedUnplaced >= openEarly) throw new PickError("early_spot_reserved");
  }

  const picks = new Map(state.picks);
  picks.set(spot, memberId);
  return { ...state, picks };
}

/** Closes picking: members who did not pick get the open spots, trusted members first. */
export function closePicking(state: PickingState, seed: string): SpotAssignment[] {
  const placed = new Set(state.picks.values());
  const unplaced = shuffle(
    state.members.filter((m) => !placed.has(m.id)).sort(byId),
    seededRandom(seed),
  ).sort((a, b) => Number(b.trusted) - Number(a.trusted));

  const bySpot = new Map(state.picks);
  for (let spot = 1; spot <= state.members.length; spot++) {
    if (!bySpot.has(spot)) bySpot.set(spot, (unplaced.shift() as Member).id);
  }

  const trustedIds = new Set(state.members.filter((m) => m.trusted).map((m) => m.id));
  return [...bySpot.entries()]
    .sort(([a], [b]) => a - b)
    .map(([spot, memberId]) => ({
      memberId,
      spot,
      earlySpot: spot <= state.earlyCount,
      requiresEarlySpotDeposit: spot <= state.earlyCount && !trustedIds.has(memberId),
    }));
}
