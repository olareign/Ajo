import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const supported = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

function subscribe(onChange: () => void): () => void {
  if (!supported()) return () => undefined;
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** True when the person has asked their device for less motion. Animated scenes then hold still. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (supported() ? window.matchMedia(QUERY).matches : false),
    () => false,
  );
}
