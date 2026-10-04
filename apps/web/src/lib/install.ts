import { useSyncExternalStore } from "react";

/** Chrome and Edge hand over the install dialog as an event; nothing else does. */
type InstallOffer = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export type InstallState = Readonly<{ canPrompt: boolean; installed: boolean }>;
export type InstallKind = "installed" | "prompt" | "ios" | "manual";
export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

const DISMISS_KEY = "ajo.install.dismissedAt";
/** "Not now" means not today: the person asked to see this again, not never. */
const QUIET_FOR_MS = 24 * 60 * 60 * 1000;

let offer: InstallOffer | null = null;
let installed = false;
let started = false;
let state: InstallState = { canPrompt: false, installed: false };
const listeners = new Set<() => void>();

function publish() {
  state = { canPrompt: offer !== null, installed };
  listeners.forEach((listener) => listener());
}

/**
 * Listens for the browser's install offer. It fires once, early, so this runs as the page's script
 * loads. Holding the event back (preventDefault) lets the app show the offer when it chooses.
 */
export function startInstallCapture(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    offer = event as InstallOffer;
    publish();
  });
  window.addEventListener("appinstalled", () => {
    offer = null;
    installed = true;
    publish();
  });
}

/** Test hook: forget everything, as if the page had just loaded. */
export function resetInstallForTests(): void {
  offer = null;
  installed = false;
  started = false;
  state = { canPrompt: false, installed: false };
  listeners.clear();
}

export const currentInstallState = (): InstallState => state;

export async function promptInstall(): Promise<InstallOutcome> {
  const current = offer;
  if (!current) return "unavailable";
  // A browser allows each offer one use, whatever the answer.
  offer = null;
  publish();
  await current.prompt();
  const { outcome } = await current.userChoice;
  return outcome === "accepted" ? "accepted" : "dismissed";
}

/** Running as an installed app already (Android and desktop report it, and iOS has its own flag). */
function runningAsApp(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return standalone || (navigator as { standalone?: boolean }).standalone === true;
}

export function installKind(current: InstallState, userAgent: string): InstallKind {
  if (current.installed) return "installed";
  if (current.canPrompt) return "prompt";
  return /iPad|iPhone|iPod/.test(userAgent) ? "ios" : "manual";
}

export function rememberDismissal(now: number): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(now));
  } catch {
    // Storage can be blocked; the card then simply shows again next time.
  }
}

export function isDismissedRecently(now: number): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && now - at < QUIET_FOR_MS;
  } catch {
    return false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** What to show about installing: the kind of help, and the way to start the browser's dialog. */
export function useInstall(): Readonly<{
  kind: InstallKind | "unknown";
  install: () => Promise<InstallOutcome>;
}> {
  const current = useSyncExternalStore(subscribe, currentInstallState, currentInstallState);
  // On the server, and until the page is running in a browser, there is nothing to say.
  const inBrowser = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (!inBrowser) return { kind: "unknown", install: promptInstall };
  const kind = installKind(
    { ...current, installed: current.installed || runningAsApp() },
    navigator.userAgent,
  );
  return { kind, install: promptInstall };
}
