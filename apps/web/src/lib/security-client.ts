import { postJson } from "@/components/auth/post-json";
import { send, type Outcome } from "./api-send";

export type Session = Readonly<{
  id: string;
  device: string;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}>;
export type TrustedDevice = Readonly<{
  id: string;
  device: string;
  lastUsedAt: string;
  expiresAt: string;
}>;
export type SecurityEventKind =
  | "signed_in"
  | "new_device"
  | "password_changed"
  | "password_reset"
  | "pin_changed"
  | "pin_reset"
  | "mfa_on"
  | "mfa_off"
  | "recovery_codes_renewed"
  | "device_signed_out"
  | "signed_out_everywhere"
  | "device_forgotten"
  | "phone_changed"
  | "account_closed";
export type SecurityEvent = Readonly<{
  kind: SecurityEventKind;
  device: string | null;
  ip: string | null;
  at: string;
}>;

const list = async <T>(path: string): Promise<Outcome<readonly T[]>> => {
  const r = await send<T[] | Record<string, never>>("GET", path);
  return r.ok ? { ok: true, data: Array.isArray(r.data) ? r.data : [] } : r;
};
const id = encodeURIComponent;

export const loadSessions = () => list<Session>("/api/me/security/sessions");
export const loadTrustedDevices = () => list<TrustedDevice>("/api/me/security/trusted-devices");
export const loadSecurityEvents = () => list<SecurityEvent>("/api/me/security/events");
export const signOutDevice = (sessionId: string) =>
  send<Record<string, never>>("DELETE", `/api/me/security/sessions/${id(sessionId)}`);
export const forgetDevice = (deviceId: string) =>
  send<Record<string, never>>("DELETE", `/api/me/security/trusted-devices/${id(deviceId)}`);

/*
 * Changes go through postJson, which keeps the API's own words for a weak password (messageOf) and
 * forgets what this visit remembered, as every change does.
 */
export const changePassword = (input: {
  currentPassword: string;
  newPassword: string;
  code?: string;
}) => postJson("/api/me/security/password", input);
export const changePin = (input: { currentPin: string; newPin: string }) =>
  postJson("/api/me/security/pin", input);
export const resetPin = (input: { password: string; code: string; newPin: string }) =>
  postJson("/api/me/security/pin/reset", input);
export const renewRecoveryCodes = (input: { password: string; code: string }) =>
  postJson("/api/me/security/recovery-codes", input);
