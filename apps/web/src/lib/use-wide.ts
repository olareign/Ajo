import { useSyncExternalStore } from "react";

/** The desktop layout starts here: Tailwind's `lg`. */
const WIDE = "(min-width: 1024px)";

const query = () => (typeof window.matchMedia === "function" ? window.matchMedia(WIDE) : null);

function subscribe(onChange: () => void): () => void {
  const q = query();
  q?.addEventListener("change", onChange);
  return () => q?.removeEventListener("change", onChange);
}

/**
 * Whether the screen is desk-wide. For parts that only exist there and fetch their own data, so a
 * phone never asks for what it won't show. False on the server and on a phone.
 */
export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? false,
    () => false,
  );
}
