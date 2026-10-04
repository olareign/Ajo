import { send, type Outcome } from "./api-send";

export type Relation = "none" | "friend" | "requested" | "incoming";

export type Trust = Readonly<{ level: "new" | "building" | "trusted"; score: number }>;

export type Person = Readonly<{
  username: string;
  displayName: string;
  relation: Relation;
  mutualFriends: number;
  /** 1 passport stamped; 2 with a national check too. */
  tier: 1 | 2;
  trust: Trust;
}>;

export type Suggestion = Person &
  Readonly<{ reason: "mutual" | "invited_you" | "you_invited"; mutualNames: readonly string[] }>;

export type Friend = Readonly<{
  username: string;
  displayName: string;
  since: string;
  tier: 1 | 2;
  trust: Trust;
}>;
export type FriendRequest = Readonly<{
  username: string;
  displayName: string;
  sentAt: string;
  tier: 1 | 2;
}>;
export type Requests = Readonly<{
  incoming: readonly FriendRequest[];
  outgoing: readonly FriendRequest[];
}>;
export type Blocked = Readonly<{ username: string; displayName: string; blockedAt: string }>;
export type Invite = Readonly<{ code: string; link: string }>;
export type ReportReason = "spam" | "harassment" | "fake_account" | "scam" | "other";

const enc = encodeURIComponent;

export const loadFriends = async (): Promise<Outcome<readonly Friend[]>> => {
  const r = await send<{ friends: Friend[] }>("GET", "/api/friends");
  return r.ok ? { ok: true, data: r.data.friends ?? [] } : r;
};
export const loadRequests = async (): Promise<Outcome<Requests>> => {
  const r = await send<Partial<Requests>>("GET", "/api/friends/requests");
  return r.ok
    ? { ok: true, data: { incoming: r.data.incoming ?? [], outgoing: r.data.outgoing ?? [] } }
    : r;
};
export const loadSuggestions = async (): Promise<Outcome<readonly Suggestion[]>> => {
  const r = await send<Suggestion[] | Record<string, never>>("GET", "/api/friends/suggestions");
  return r.ok ? { ok: true, data: Array.isArray(r.data) ? r.data : [] } : r;
};
export const searchPeople = async (q: string): Promise<Outcome<readonly Person[]>> => {
  const r = await send<Person[] | Record<string, never>>("GET", `/api/friends/search?q=${enc(q)}`);
  return r.ok ? { ok: true, data: Array.isArray(r.data) ? r.data : [] } : r;
};
export const loadPerson = (username: string) =>
  send<Person>("GET", `/api/friends/people/${enc(username)}`);
export const loadBlocks = async (): Promise<Outcome<readonly Blocked[]>> => {
  const r = await send<Blocked[] | Record<string, never>>("GET", "/api/friends/blocks");
  return r.ok ? { ok: true, data: Array.isArray(r.data) ? r.data : [] } : r;
};
export const loadInvite = () => send<Invite>("GET", "/api/friends/invite");

export const sendRequest = (username: string) =>
  send<{ relation: Relation }>("POST", "/api/friends/requests", { body: { username } });
export const acceptRequest = (username: string) =>
  send<{ relation: Relation }>("POST", `/api/friends/${enc(username)}/accept`);
export const declineRequest = (username: string) =>
  send<Record<string, never>>("POST", `/api/friends/${enc(username)}/decline`);
export const cancelRequest = (username: string) =>
  send<Record<string, never>>("POST", `/api/friends/${enc(username)}/cancel`);
export const removeFriend = (username: string) =>
  send<Record<string, never>>("POST", `/api/friends/${enc(username)}/remove`);
export const unblockPerson = (username: string) =>
  send<Record<string, never>>("POST", `/api/friends/${enc(username)}/unblock`);
export const blockPerson = (username: string) =>
  send<Record<string, never>>("POST", "/api/friends/blocks", { body: { username } });
export const reportPerson = (username: string, reason: ReportReason, details?: string) =>
  send<Record<string, never>>("POST", "/api/friends/reports", {
    body: { username, reason, ...(details?.trim() ? { details: details.trim() } : {}) },
  });
