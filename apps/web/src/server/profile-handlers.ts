import { proxy } from "./api-proxy";
import type { Deps } from "./auth-handlers";
import { withSession } from "./me-handlers";

/** The phone number on the account: only the number itself reaches the API. */
export const handleSetPhone = (request: Request, deps: Deps) =>
  proxy(request, deps, "/me/phone", "PUT", { keys: ["phone"] });
export const handleRemovePhone = (request: Request, deps: Deps) =>
  proxy(request, deps, "/me/phone", "DELETE", {});

/** Which optional emails the person wants. Money and account emails always go. */
export const handleEmailSettings = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/notifications/settings", method: "GET" });
export const handleSaveEmailSettings = (request: Request, deps: Deps) =>
  proxy(request, deps, "/notifications/settings", "PUT", {
    keys: ["reminders", "savings", "circles", "friends"],
  });
