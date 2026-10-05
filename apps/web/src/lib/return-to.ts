/**
 * Where to bring someone back to after they sign in, sign up or finish setting up: only ever an
 * invite inside this app. The allow-list is the whole defence against being used to bounce people to
 * another site, so nothing else is accepted, however it is written.
 */
const INVITE_PATHS = [/^\/join\/[A-Za-z0-9_-]{4,20}$/, /^\/circles\/join\/[A-Za-z0-9]{8}$/];

const KEY = "ajo-return-to";
/** An invite remembered a day ago is no longer what the person is doing. */
const KEEP_MS = 24 * 60 * 60 * 1000;

export const safeReturn = (path: string | null | undefined): string | null =>
  typeof path === "string" && INVITE_PATHS.some((p) => p.test(path)) ? path : null;

/**
 * Remembers an invite on this device, so the person lands back on it even after confirming their
 * email in another tab. Storage may be blocked: then they simply land on Today.
 */
export function rememberReturn(path: string, now = Date.now()): void {
  if (!safeReturn(path)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: now }));
  } catch {
    // Blocked storage: nothing to remember with.
  }
}

/** The remembered invite, once: reading it forgets it. */
export function takeReturn(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof value.at !== "number" || now - value.at > KEEP_MS) return null;
    return safeReturn(typeof value.path === "string" ? value.path : null);
  } catch {
    return null;
  }
}
