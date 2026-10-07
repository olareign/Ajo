"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Failure, Result } from "./admin-client";

export type Loaded<T> =
  | Readonly<{ phase: "loading" }>
  | Readonly<{ phase: "ready"; data: T }>
  | Readonly<{ phase: "failed"; failure: Failure }>;

/**
 * Loads something when a screen opens (and again when `key` changes or `reload` is called), and sends
 * a member whose session has ended to the sign-in page.
 */
export function useLoad<T>(
  load: () => Promise<Result<T>>,
  key = "",
): {
  state: Loaded<T>;
  reload: () => void;
} {
  const router = useRouter();
  const [state, setState] = useState<Loaded<T>>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(load);
  useLayoutEffect(() => {
    latest.current = load;
  });

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await latest.current();
      if (!live) return;
      if (!result.ok && result.failure.signedOut) return router.replace("/login");
      setState(
        result.ok
          ? { phase: "ready", data: result.data }
          : { phase: "failed", failure: result.failure },
      );
    })();
    return () => {
      live = false;
    };
  }, [router, attempt, key]);

  return {
    state,
    reload: () => {
      setState({ phase: "loading" });
      setAttempt((n) => n + 1);
    },
  };
}
