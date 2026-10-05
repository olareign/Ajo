/** How people reach a person at Àjọ. Public on purpose: it is shown on Help and in the legal pages. */
export const SUPPORT_EMAIL = "abdulrasaqolarewaju88@gmail.com";

export const supportMailto = (subject: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

/** The terms and privacy notice are drafts until a lawyer has reviewed them. */
export const LEGAL = { draft: true, updated: "5 October 2026" } as const;
