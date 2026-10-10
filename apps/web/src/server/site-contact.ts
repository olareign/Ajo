import "server-only";
import { cache } from "react";
import { DEFAULT_SUPPORT_EMAIL, isPlainEmail } from "@/lib/support";
import { loadServerEnv } from "./env";

type Fetch = (
  url: string,
  init?: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

/** How long a page keeps the address before asking again; the API caches it for the same time. */
export const CONTACT_REVALIDATE_SECONDS = 60;

/**
 * The support email staff set in the admin console. Shown on public pages, so it never blocks one:
 * if the API is slow, down or answers with anything but a plain address, the default is used.
 */
export async function readSupportEmail(fetchFn: Fetch = fetch): Promise<string> {
  try {
    const { apiBaseUrl } = loadServerEnv(process.env);
    const res = await fetchFn(`${apiBaseUrl}/api/v1/site/contact`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(3000),
      next: { revalidate: CONTACT_REVALIDATE_SECONDS },
    });
    if (!res.ok) return DEFAULT_SUPPORT_EMAIL;
    const body: unknown = await res.json();
    const email =
      body && typeof body === "object" ? (body as { supportEmail?: unknown }).supportEmail : null;
    return isPlainEmail(email) ? email : DEFAULT_SUPPORT_EMAIL;
  } catch {
    return DEFAULT_SUPPORT_EMAIL;
  }
}

/** Once per request, however many parts of the page ask. */
export const supportEmail = cache(() => readSupportEmail());
