/**
 * CSRF defence for every state-changing BFF route, on top of SameSite=strict cookies:
 * the request must come from this app's own pages.
 */
export function isSameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
