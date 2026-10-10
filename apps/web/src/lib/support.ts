/**
 * How people reach a person at Àjọ. Staff change the address in the admin console; this one is used
 * until the API answers, or if it can't.
 */
export const DEFAULT_SUPPORT_EMAIL = "info@ajo.com";

/** A plain address only: no display name, no spaces or line breaks that could add mail headers. */
const PLAIN_EMAIL = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;

export const isPlainEmail = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 254 && PLAIN_EMAIL.test(value);

export const supportMailto = (email: string, subject: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}`;

/** The terms and privacy notice are drafts until a lawyer has reviewed them. */
export const LEGAL = { draft: true, updated: "10 October 2026" } as const;
