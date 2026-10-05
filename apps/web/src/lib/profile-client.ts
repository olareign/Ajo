import { postJson } from "@/components/auth/post-json";
import { send } from "./api-send";

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
