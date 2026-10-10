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

/** Pages that use the whole width of a wide screen themselves (the landing page). */
export const isFullWidthRoute = (path: string): boolean => path === "/";
