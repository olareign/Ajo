import { send, type Outcome } from "./api-send";
import type { MoneyDto } from "./money-format";

export type GroupFrequency = "weekly" | "biweekly" | "monthly";
export type OrderMethod = "random" | "pick" | "join_order";
export type Visibility = "private" | "public";
export type GroupStatus = "open" | "picking" | "running" | "completed" | "cancelled";
export type TrustLevel = "new" | "building" | "trusted";
export type Trust = Readonly<{ level: TrustLevel; score: number }>;
export type ContributionStatus = "scheduled" | "paid" | "late" | "covered" | "missed";

export type GroupSummary = Readonly<{
  id: string;
  name: string;
  community: string | null;
  status: GroupStatus;
  currency: string;
  /** Each person's contribution, whole minor units. */
  contribution: string;
  frequency: GroupFrequency;
  size: number;
  memberCount: number;
  startDate: string;
  orderMethod: OrderMethod;
  visibility: Visibility;
  /** What each turn pays out before any fee. */
  pot: string;
  creator: Readonly<{ username: string | null; displayName: string }>;
  isMember: boolean;
  isCreator: boolean;
  mySpot: number | null;
  friendsIn: number;
  inviteCode: string | null;
  /** The deposits, fee and grace period this circle was made with. */
  rules: CircleRules;
}>;

export type DiscoveredGroup = GroupSummary & Readonly<{ score: number }>;

export type CircleMember = Readonly<{
  username: string | null;
  displayName: string;
  spot: number | null;
  isYou: boolean;
  isCreator: boolean;
  trust: Trust;
  /** This round's payment, once rounds have begun. */
  current: ContributionStatus | null;
}>;

export type RoundView = Readonly<{
  roundNo: number;
  dueOn: string;
  recipient: string | null;
  recipientName: string;
  isYours: boolean;
  status: "scheduled" | "paid_out" | "paid_out_short";
  payout: MoneyDto | null;
  fee: MoneyDto | null;
  paid: number;
  yours: ContributionStatus | null;
  board: readonly {
    username: string | null;
    displayName: string;
    status: ContributionStatus | null;
  }[];
}>;

export type DrawView = Readonly<{
  kind: "random" | "pick_leftover";
  seed: string;
  createdAt: string;
  order: readonly { spot: number | null; username: string | null; displayName: string }[];
}>;

export type CircleRules = Readonly<{
  deposit: MoneyDto;
  earlyDeposit: MoneyDto;
  earlySpots: number;
  feeBps: number;
  lateFeeBps: number;
  graceDays: number;
}>;

export type GroupDetail = GroupSummary &
  Readonly<{
    members: readonly CircleMember[];
    rounds: readonly RoundView[];
    draws: readonly DrawView[];
    myDeposit: MoneyDto | null;
    pickDeadline: string | null;
    nextDue: Readonly<{ roundNo: number; dueOn: string }> | null;
    graceDays: number;
  }>;

export type GroupInput = Readonly<{
  name: string;
  community?: string;
  contribution: string;
  frequency: GroupFrequency;
  size: number;
  startDate: string;
  orderMethod: OrderMethod;
  visibility: Visibility;
}>;

export type GroupPreview = Readonly<{
  dates: readonly string[];
  pot: MoneyDto;
  fee: MoneyDto;
  deposit: MoneyDto;
  earlyDeposit: MoneyDto;
  earlySpots: number;
  graceDays: number;
}>;

export type Swap = Readonly<{
  id: string;
  fromUsername: string;
  fromName: string;
  toUsername: string;
  toName: string;
  incoming: boolean;
}>;

const enc = encodeURIComponent;
const list = <T>(r: Outcome<{ groups: T[] }>): Outcome<readonly T[]> =>
  r.ok ? { ok: true, data: r.data.groups ?? [] } : r;

export const loadGroups = async () =>
  list(await send<{ groups: GroupSummary[] }>("GET", "/api/groups"));
export const loadDiscover = async () =>
  list(await send<{ groups: DiscoveredGroup[] }>("GET", "/api/groups/discover"));
export const loadGroup = (id: string) => send<GroupDetail>("GET", `/api/groups/${enc(id)}`);
export const loadGroupByCode = (code: string) =>
  send<GroupSummary>("GET", `/api/groups/code/${enc(code)}`);
export const previewGroup = (input: GroupInput) =>
  send<GroupPreview>("POST", "/api/groups/preview", { body: input });
export const createGroup = (input: GroupInput, key: string) =>
  send<GroupDetail>("POST", "/api/groups", { body: input, key });
export const joinByCode = (code: string) =>
  send<GroupDetail>("POST", "/api/groups/join", { body: { code } });
export const joinPublic = (id: string) => send<GroupDetail>("POST", `/api/groups/${enc(id)}/join`);
export const leaveGroup = (id: string) =>
  send<GroupSummary>("POST", `/api/groups/${enc(id)}/leave`);
export const cancelGroup = (id: string) =>
  send<GroupDetail>("POST", `/api/groups/${enc(id)}/cancel`);
export const inviteToGroup = (id: string, username: string) =>
  send<Record<string, never>>("POST", `/api/groups/${enc(id)}/invite`, { body: { username } });
export const pickSpot = (id: string, spot: number) =>
  send<GroupDetail>("POST", `/api/groups/${enc(id)}/pick`, { body: { spot } });
export const loadSwaps = async (id: string): Promise<Outcome<readonly Swap[]>> => {
  const r = await send<Swap[] | Record<string, never>>("GET", `/api/groups/${enc(id)}/swaps`);
  return r.ok ? { ok: true, data: Array.isArray(r.data) ? r.data : [] } : r;
};
export const proposeSwap = (id: string, username: string) =>
  send<GroupDetail>("POST", `/api/groups/${enc(id)}/swaps`, { body: { username } });
export const answerSwap = (id: string, swapId: string, accept: boolean) =>
  send<GroupDetail>("POST", `/api/groups/${enc(id)}/swaps/${enc(swapId)}`, { body: { accept } });
