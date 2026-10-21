import { useSyncExternalStore } from "react";

/** Whether the desk sidebar is folded to icons. Remembered on this device; a preference only. */
const KEY = "ajo-sidebar";
const CHANGE = "ajo-sidebar-change";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "compact";
  } catch {
    return false;
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

export function setCompact(compact: boolean): void {
  try {
    if (compact) localStorage.setItem(KEY, "compact");
    else localStorage.removeItem(KEY);
  } catch {
    // Blocked storage: the choice lasts until the page closes.
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** False on the server: the full sidebar is drawn first and folds once the page knows. */
export function useCompactSidebar(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
