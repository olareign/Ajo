import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy, createNonce } from "./security/headers";

const OPEN_PAGES = new Set(["/login", "/setup"]);
const COOKIES = ["__Host-ajo_admin", "ajo_admin"];

/**
 * Adds a per-request nonce-based Content Security Policy to every page, and sends anyone with no
 * session cookie at all to the sign-in page before a console page is even drawn. (This is only a
 * first gate for tidiness: the cookie's contents are checked by the API on every call.)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!OPEN_PAGES.has(pathname) && !COOKIES.some((name) => request.cookies.has(name))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
