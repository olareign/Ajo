import type { Deps } from "./auth-handlers";
import { withSession } from "./me-handlers";

/** The person's own verification progress. Nothing from the browser's request reaches the API. */
export const handleKyc = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/kyc", method: "GET" });

/** Their wallet currency, whether they are approved, and which payment actions are connected. */
export const handleRails = (request: Request, deps: Deps) =>
  withSession(request, deps, { path: "/wallet/rails", method: "GET" });
