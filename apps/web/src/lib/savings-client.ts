import { send, type Outcome } from "./api-send";
import type { MoneyDto } from "./money-format";

export type Frequency = "daily" | "weekly" | "monthly";
export type PlanStatus = "active" | "paused" | "completed" | "cancelled";
export type DebitStatus = "scheduled" | "paid" | "failed" | "skipped";

export type Plan = Readonly<{
  id: string;
  name: string;
  status: PlanStatus;
  frequency: Frequency;
  amount: MoneyDto;
  totalDebits: number;
  startDate: string;
  endDate: string;
  saved: MoneyDto;
  target: MoneyDto;
  paidDebits: number;
  failedDebits: number;
  nextDebit: Readonly<{ dueOn: string; amount: MoneyDto }> | null;
  topupFromBank: boolean;
  payout: MoneyDto | null;
  penalty: MoneyDto;
  createdAt: string;
  closedAt: string | null;
}>;

export type HistoryItem = Readonly<{
  type: string;
  direction: "in" | "out";
  amount: MoneyDto;
  createdAt: string;
}>;

export type PlanDetail = Plan &
  Readonly<{
    earlyWithdrawalPenaltyBps: number;
    schedule: readonly { seq: number; dueOn: string; status: DebitStatus }[];
    history: readonly HistoryItem[];
  }>;

export type PlanInput = Readonly<{
  name: string;
  amount: string;
  frequency: Frequency;
  totalDebits: number;
  startDate: string;
  topupFromBank?: boolean;
}>;

export type PlanPreview = Readonly<{ dates: readonly string[]; total: MoneyDto; endDate: string }>;

export const loadPlans = async (): Promise<Outcome<readonly Plan[]>> => {
  const result = await send<{ plans: Plan[] }>("GET", "/api/savings");
  return result.ok ? { ok: true, data: result.data.plans ?? [] } : result;
};

export const loadPlan = (id: string) =>
  send<PlanDetail>("GET", `/api/savings/${encodeURIComponent(id)}`);

export const previewPlan = (input: PlanInput) =>
  send<PlanPreview>("POST", "/api/savings/preview", { body: input });

export const createPlan = (input: PlanInput, key: string) =>
  send<PlanDetail>("POST", "/api/savings", { body: input, key });

export const pausePlan = (id: string) =>
  send<PlanDetail>("POST", `/api/savings/${encodeURIComponent(id)}/pause`);
export const resumePlan = (id: string) =>
  send<PlanDetail>("POST", `/api/savings/${encodeURIComponent(id)}/resume`);

export const topUpPlan = (id: string, amount: string, key: string) =>
  send<PlanDetail>("POST", `/api/savings/${encodeURIComponent(id)}/topup`, {
    body: { amount },
    key,
  });

export const endPlanEarly = (id: string, pin: string) =>
  send<PlanDetail>("POST", `/api/savings/${encodeURIComponent(id)}/withdraw`, { body: { pin } });

// ---- messages ------------------------------------------------------------------------------------

export type Notice = Readonly<{
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}>;
export type NoticePage = Readonly<{
  items: readonly Notice[];
  next: string | null;
  unread: number;
}>;

export const loadNotices = (before?: string) =>
  send<NoticePage>("GET", `/api/notifications?limit=20${before ? `&before=${before}` : ""}`);
export const readNotice = (id: string) =>
  send<Record<string, never>>("POST", `/api/notifications/${encodeURIComponent(id)}/read`);
export const readAllNotices = () =>
  send<Record<string, never>>("POST", "/api/notifications/read-all");
