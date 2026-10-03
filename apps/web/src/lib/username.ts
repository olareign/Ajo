/** The same rule the API and the database enforce: a letter first, then 2 to 19 of a-z, 0-9, _. */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

/** What the API stores: trimmed, lowercase, no leading @. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/** Why a name will not do, in plain words; null for an empty box or a name that is fine. */
export function usernameProblem(raw: string): string | null {
  const name = normalizeUsername(raw);
  if (name === "" || USERNAME_PATTERN.test(name)) return null;
  if (!/^[a-z0-9_]+$/.test(name)) return "Use only letters, numbers and underscores.";
  if (!/^[a-z]/.test(name)) return "Start with a letter.";
  if (name.length < 3) return "Use at least 3 characters.";
  return "Keep it to 20 characters or fewer.";
}

/** Letters and digits only, accents and dots under letters folded away ("Adébáyọ̀" becomes "adebayo"). */
const words = (name: string): string[] =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** A few ideas to start from, built from the person's own name. Empty when it has no usable letters. */
export function suggestUsernames(displayName: string): string[] {
  const parts = words(displayName);
  const first = parts[0];
  if (!first) return [];
  const last = parts.length > 1 ? parts[parts.length - 1]! : undefined;
  const ideas = [
    first,
    last && `${first}_${last}`,
    last && `${first}${last[0]}`,
    `${first}_ajo`,
    last && `${first}${last}`,
  ].filter((idea): idea is string => Boolean(idea) && USERNAME_PATTERN.test(idea as string));
  return [...new Set(ideas)].slice(0, 4);
}
