/** The signed-in parts of the app: on a wide screen these get the sidebar. */
const APP_SECTIONS = [
  "/today",
  "/save",
  "/circles",
  "/wallet",
  "/friends",
  "/me",
  "/notifications",
  "/insights",
  "/verify",
] as const;

export const isAppRoute = (path: string): boolean =>
  APP_SECTIONS.some((section) => path === section || path.startsWith(`${section}/`));

/** The public pages that lay themselves out at every width (they bring their own header and footer). */
const PUBLIC_PAGES = ["/how-it-works", "/safety", "/about", "/help", "/terms", "/privacy"] as const;

const matches = (path: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export const isPublicPage = (path: string): boolean => matches(path, PUBLIC_PAGES);

/** Sign-in and its neighbours: a split screen on a desk, a phone column otherwise. */
const AUTH_PAGES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  "/verify-email",
] as const;

/** Pages that use the whole width of a wide screen themselves: the landing page, public pages and sign-in. */
export const isFullWidthRoute = (path: string): boolean =>
  path === "/" || isPublicPage(path) || matches(path, AUTH_PAGES);
