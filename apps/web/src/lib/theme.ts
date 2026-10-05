import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-script";

export { THEME_KEY, THEME_SCRIPT } from "./theme-script";

/** What the person picked on Me. "system" (the default) follows the device. */
export type ThemeChoice = "system" | "light" | "dark";

export function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** Applies a choice to the page and remembers it on this device (storage may be blocked: then it lasts the visit). */
const CHANGE = "ajo-theme-change";

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Private windows and blocked storage: the choice still applies until the page closes.
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** What the page shows now: the attribute, which holds the choice even when storage is blocked. */
function current(): ThemeChoice {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const choice = useSyncExternalStore(subscribe, current, () => "system" as const);
  return [choice, applyTheme];
}
