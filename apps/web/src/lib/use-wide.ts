import { useSyncExternalStore } from "react";

/** The desktop layout starts at Tailwind's `lg`; a tablet's at `md`. */
const QUERIES = { lg: "(min-width: 1024px)", md: "(min-width: 768px)" } as const;
type Breakpoint = keyof typeof QUERIES;

const query = (at: Breakpoint) =>
  typeof window.matchMedia === "function" ? window.matchMedia(QUERIES[at]) : null;

const subscribers = {
  lg: (onChange: () => void) => subscribe("lg", onChange),
  md: (onChange: () => void) => subscribe("md", onChange),
};

function subscribe(at: Breakpoint, onChange: () => void): () => void {
  const q = query(at);
  q?.addEventListener("change", onChange);
  return () => q?.removeEventListener("change", onChange);
}

/**
 * Whether the screen is desk-wide (or, with "md", at least tablet-wide). For parts that only exist
 * there and fetch their own data, so a phone never asks for what it won't show. False on the
 * server and on a phone.
 */
export function useWide(at: Breakpoint = "lg"): boolean {
  return useSyncExternalStore(
    subscribers[at],
    () => query(at)?.matches ?? false,
    () => false,
  );
}
