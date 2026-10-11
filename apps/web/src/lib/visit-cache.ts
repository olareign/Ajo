import { useSyncExternalStore } from "react";

/**
 * What this visit has already loaded, kept in memory only (never in storage), so going back to a
 * screen shows it at once while a fresh copy loads behind. It is emptied when someone signs in or
 * out, when the server says the session has ended, and after anything the person changes (a payment,
 * a join, a new PIN), so nothing is shown stale after they act.
 */
const store = new Map<string, unknown>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function recall<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function remember<T>(key: string, value: T): void {
  store.set(key, value);
  notify();
}

export function forgetAll(): void {
  store.clear();
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * A value from this visit that keeps up when it arrives or is forgotten: for parts of the page drawn
 * before the screen that loads it (the desktop header shows your name once the screen has asked).
 */
export function useRecall<T>(key: string): T | undefined {
  return useSyncExternalStore(
    subscribe,
    () => recall<T>(key),
    () => undefined,
  );
}
