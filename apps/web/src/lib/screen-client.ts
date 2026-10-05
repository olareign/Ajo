import { forgetAll } from "./visit-cache";
import type { Loaded } from "./wallet-client";

/** One part of a screen's reply: the API's own status and body for that part. */
export type Part = Readonly<{ status: number; data: Record<string, unknown> }>;
export type ScreenData = Readonly<Record<string, Part | undefined>>;

/** A screen's data in one request (see src/server/screen-handlers.ts). */
export async function loadScreen(
  name: "today" | "wallet" | "friends",
): Promise<Loaded<ScreenData>> {
  try {
    const res = await fetch(`/api/screens/${name}`, { credentials: "same-origin" });
    if (res.status === 401) {
      forgetAll();
      return { status: "signed-out" };
    }
    if (!res.ok) return { status: "failed" };
    return { status: "ok", data: (await res.json()) as ScreenData };
  } catch {
    return { status: "failed" };
  }
}

/** The part's body when the API said yes, otherwise null (refused or unreachable: the screen shows less). */
export const partData = (part: Part | undefined): Record<string, unknown> | null =>
  part && part.status >= 200 && part.status < 300 ? part.data : null;
