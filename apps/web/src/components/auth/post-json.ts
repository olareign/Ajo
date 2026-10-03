export type PostResult = Readonly<{ ok: boolean; status: number; data: Record<string, unknown> }>;

export const OFFLINE = "We couldn't reach Àjọ. Check your connection and try again.";

/** POSTs JSON to our own server (the BFF). Never throws; a network failure is a result. */
export async function postJson(
  path: string,
  body: object,
  method: "POST" | "PUT" | "DELETE" = "POST",
): Promise<PostResult> {
  try {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data =
      res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as Record<string, unknown>);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: OFFLINE } };
  }
}

const PASSWORD_PROBLEMS: Record<string, string> = {
  too_short: "Use at least 12 characters. A few words strung together works well.",
  too_long: "That's longer than 128 characters. Try a shorter phrase.",
  contains_email: "Your password shouldn't contain the first part of your email.",
  breached: "That password has appeared in a data breach. Choose a different one.",
};

export function messageOf(result: PostResult): string {
  const problems = (result.data.details as { password?: unknown } | undefined)?.password;
  if (Array.isArray(problems)) {
    const known = problems.map((p) => PASSWORD_PROBLEMS[String(p)]).find(Boolean);
    if (known) return known;
  }
  const message = result.data.message;
  if (typeof message === "string") return message;
  // The API lists validation problems as an array of developer-facing text; never show that.
  if (Array.isArray(message)) return "Check what you entered and try again.";
  return "Something went wrong. Please try again.";
}
