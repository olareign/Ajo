import { useSyncExternalStore } from "react";

const KEY = "ajo-hide-balance";
const CHANGE = "ajo-hide-balance-change";
// Kept here too, so the choice still lasts the visit when storage is blocked.
let fallback = false;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function toggle(): void {
  const next = !read();
  fallback = next;
  try {
    if (next) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Blocked storage: `fallback` carries it for the visit.
  }
  window.dispatchEvent(new Event(CHANGE));
}

/**
 * Whether balances are hidden behind dots, for looking at the app in public. Remembered on this
 * device and shared by every balance on screen; shown by default.
 */
export function useHiddenBalance(): [boolean, () => void] {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  return [hidden, toggle];
}
