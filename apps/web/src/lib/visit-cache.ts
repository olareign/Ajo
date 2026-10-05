/**
 * What this visit has already loaded, kept in memory only (never in storage), so going back to a
 * screen shows it at once while a fresh copy loads behind. It is emptied when someone signs in or
 * out, when the server says the session has ended, and after anything the person changes (a payment,
 * a join, a new PIN), so nothing is shown stale after they act.
 */
const store = new Map<string, unknown>();

export function recall<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function remember<T>(key: string, value: T): void {
  store.set(key, value);
}

export function forgetAll(): void {
  store.clear();
}
