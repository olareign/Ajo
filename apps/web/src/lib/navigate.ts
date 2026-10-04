/**
 * Leaves for a page the payment partner hosts. Kept in one place so tests can stand in for it, and
 * so only a secure address is ever followed: what comes back from the API is data, not an order.
 */
export function leaveFor(url: string): boolean {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  if (target.protocol !== "https:") return false;
  window.location.assign(target.href);
  return true;
}
