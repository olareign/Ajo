import { OFFLINE, postJson, type PostResult } from "@/components/auth/post-json";
import { send } from "./api-send";
import { forgetAll } from "./visit-cache";

/** The optional emails a person can turn off. Money and account emails always go. */
export type EmailChoices = Readonly<{
  reminders: boolean;
  savings: boolean;
  circles: boolean;
  friends: boolean;
}>;

export const setPhone = (phone: string) => postJson("/api/me/phone", { phone }, "PUT");
export const removePhone = () => postJson("/api/me/phone", {}, "DELETE");

export const loadEmailChoices = () => send<EmailChoices>("GET", "/api/notifications/settings");
export const saveEmailChoice = (change: Partial<EmailChoices>) =>
  postJson("/api/notifications/settings", change, "PUT");

export const closeAccount = (input: { password: string; code?: string }) =>
  postJson("/api/me/security/close", input);

/** The cropped picture, as the request body (the server redraws it and keeps it private). */
export async function uploadPhoto(picture: Blob): Promise<PostResult> {
  // Everything remembered about who you are (and your picture) is now out of date.
  forgetAll();
  try {
    const res = await fetch("/api/me/photo", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": picture.type || "image/jpeg" },
      body: picture,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: OFFLINE } };
  }
}

export const removePhoto = () => postJson("/api/me/photo", {}, "DELETE");
