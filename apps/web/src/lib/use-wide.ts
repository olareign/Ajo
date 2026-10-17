import { useSyncExternalStore } from "react";

/** The desk layout (sidebar, wide pages) starts at Tailwind's `md`, a tablet; `lg` is a full desk. */
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
 * Whether the screen is desk-wide: a tablet or wider (or, with "lg", a full desk). For parts that only exist
 * there and fetch their own data, so a phone never asks for what it won't show. False on the
 * server and on a phone.
 */
export function useWide(at: Breakpoint = "md"): boolean {
  return useSyncExternalStore(
    subscribers[at],
    () => query(at)?.matches ?? false,
    () => false,
  );
}
