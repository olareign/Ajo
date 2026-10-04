"use client";

import { useEffect, useState } from "react";
import { isFinished, loadPayment, type Failure, type Payment } from "./payments-client";

/**
 * How often to ask, and how many times: about three minutes in all, after which a screen stops asking
 * and says the result will show up on its own. A plain object so a test can make it quick.
 */
export const polling = { everyMs: 3_000, limit: 60 };

export type Watched = Readonly<{
  payment?: Payment;
  failure?: Failure;
  /** The partner has not said yet, and we have stopped asking. The wallet fills in when it does. */
  gaveUp: boolean;
}>;

/**
 * Follows one payment until the partner has settled it. The server also settles it from the
 * partner's own message, so this only watches; it never decides.
 */
export function usePayment(id: string | null): Watched {
  const [state, setState] = useState<Watched>({ gaveUp: false });

  useEffect(() => {
    if (!id) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const look = async () => {
      const result = await loadPayment(id);
      if (!live) return;
      tries += 1;
      if (!result.ok) {
        // A dropped connection is worth another try; anything the API refused is final.
        if (result.failure.kind === "unreachable" && tries < polling.limit) {
          timer = setTimeout(() => void look(), polling.everyMs);
          return;
        }
        return setState({ failure: result.failure, gaveUp: false });
      }
      const done = isFinished(result.data.status);
      const gaveUp = !done && tries >= polling.limit;
      setState({ payment: result.data, gaveUp });
      if (!done && !gaveUp) timer = setTimeout(() => void look(), polling.everyMs);
    };
    void look();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [id]);

  return state;
}
