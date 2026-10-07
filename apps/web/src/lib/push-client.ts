import { postJson, type PostResult } from "@/components/auth/post-json";
import { send } from "./api-send";

export type PushStatus = Readonly<{ enabled: boolean; publicKey: string | null; devices: number }>;

/** What this browser can do about push, and what a person has to do to get there. */
export type PushState =
  | "unsupported" // this browser cannot receive pushes at all
  | "install-first" // iPhone and iPad only push once the app is on the Home Screen
  | "blocked" // the person said no in the browser; only they can undo it
  | "off"
  | "on";

const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const isApple = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

export const canPush = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** The base64url public key as bytes, which is what a browser wants to subscribe. */
export function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const padded = key.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (key.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function pushState(): Promise<PushState> {
  if (!canPush()) return isApple() && !standalone() ? "install-first" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const existing = await navigator.serviceWorker.getRegistration("/");
  const subscription = await existing?.pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

export const loadPushStatus = () => send<PushStatus>("GET", "/api/push");

/** Asks permission, subscribes this browser and tells the API. Returns the new state. */
export async function turnOnPush(publicKey: string): Promise<PushState | { error: PostResult }> {
  if (!canPush()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }));
  const saved = await postJson("/api/push/subscriptions", subscription.toJSON());
  if (!saved.ok) {
    await subscription.unsubscribe().catch(() => false);
    return { error: saved };
  }
  return "on";
}

export async function turnOffPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  await postJson("/api/push/subscriptions", { endpoint: subscription.endpoint }, "DELETE");
  await subscription.unsubscribe().catch(() => false);
}

export const sendTestPush = () => postJson("/api/push/test", {});
