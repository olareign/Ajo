export type PostResult = Readonly<{ ok: boolean; status: number; data: Record<string, unknown> }>;

export const OFFLINE = "We couldn't reach Àjọ. Check your connection and try again.";

/** POSTs JSON to our own server (the BFF). Never throws; a network failure is a result. */
export async function postJson(path: string, body: object): Promise<PostResult> {
  try {
    const res = await fetch(path, {
      method: "POST",
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

export function messageOf(result: PostResult): string {
  return typeof result.data.message === "string"
    ? result.data.message
    : "Something went wrong. Please try again.";
}
