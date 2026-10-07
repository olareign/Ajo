import { isIP } from "node:net";

export type ClientContext = Readonly<{ ip?: string; userAgent?: string }>;

const MAX_USER_AGENT = 512;

/** The first address of a list such as "client, proxy"; only something that really is an address. */
function address(value: string | null): string | undefined {
  const first = value?.split(",")[0]?.trim();
  return first && isIP(first) !== 0 ? first : undefined;
}

/**
 * Who is behind a request: their address and device, as the host (Vercel) reports them. Vercel sets
 * these itself and overwrites anything a visitor sends, so they can be taken as they come. Without a
 * host in front (local development) there is nothing to report, and the API falls back to the
 * connection's own address.
 */
export function clientOf(request: Request): ClientContext {
  const ip =
    address(request.headers.get("x-real-ip")) ?? address(request.headers.get("x-forwarded-for"));
  const userAgent = request.headers.get("user-agent")?.slice(0, MAX_USER_AGENT);
  return { ...(ip ? { ip } : {}), ...(userAgent ? { userAgent } : {}) };
}
