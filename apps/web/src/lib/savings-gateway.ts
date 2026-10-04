import type { Failure, Outcome } from "./api-send";
import { scheduleDates, todayIn } from "./schedule";
import {
  createPlan,
  endPlanEarly,
  loadPlan,
  loadPlans,
  pausePlan,
  previewPlan,
  resumePlan,
  topUpPlan,
  type DebitStatus,
  type HistoryItem,
  type Plan,
  type PlanDetail,
  type PlanInput,
  type PlanPreview,
} from "./savings-client";

/** What the saving screens ask for. Live, it is the server; in a preview, it is a pretend one in this tab. */
export type SavingsGateway = Readonly<{
  list: () => Promise<Outcome<readonly Plan[]>>;
  get: (id: string) => Promise<Outcome<PlanDetail>>;
  preview: (input: PlanInput) => Promise<Outcome<PlanPreview>>;
  create: (input: PlanInput, key: string) => Promise<Outcome<PlanDetail>>;
  pause: (id: string) => Promise<Outcome<PlanDetail>>;
  resume: (id: string) => Promise<Outcome<PlanDetail>>;
  topUp: (id: string, amount: string, key: string) => Promise<Outcome<PlanDetail>>;
  endEarly: (id: string, pin: string) => Promise<Outcome<PlanDetail>>;
  /** Preview only: pretend the next debit's day has come. */
  takeNextDebit?: (id: string) => Promise<Outcome<PlanDetail>>;
  /** What the wallet holds, for showing whether it covers a debit or a top-up. Preview only; live reads the wallet. */
  sampleWallet?: string;
}>;

export const liveGateway: SavingsGateway = {
  list: loadPlans,
  get: loadPlan,
  preview: previewPlan,
  create: createPlan,
  pause: pausePlan,
  resume: resumePlan,
  topUp: topUpPlan,
  endEarly: endPlanEarly,
};

// ---- the pretend server -------------------------------------------------------------------------

type Store = { plans: PlanDetail[]; wallet: bigint; counter: number };

const fresh = (currency: string): Store => {
  const today = todayIn(currency);
  const store: Store = { plans: [], wallet: 4_500_000n, counter: 0 };
  store.plans.push(
    build(store, currency, today, {
      name: "Rent",
      amount: currency === "GBP" ? "2500" : "500000",
      frequency: "weekly",
      totalDebits: 12,
      startDate: shift(today, -35),
      paid: 5,
    }),
  );
  return store;
};

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

type Seed = PlanInput & { paid?: number };

function build(store: Store, currency: string, today: string, input: Seed): PlanDetail {
  const dates = scheduleDates(input.startDate, input.frequency, input.totalDebits);
  const paid = input.paid ?? 0;
  const amount = BigInt(input.amount);
  const money = (n: bigint) => ({ amount: n.toString(), currency });
  const id = `preview-${(store.counter += 1)}`;
  const history: HistoryItem[] = Array.from({ length: paid }, (_, i) => ({
    type: "savings_debit",
    direction: "in" as const,
    amount: money(amount),
    createdAt: `${dates[paid - 1 - i]}T08:00:00.000Z`,
  }));
  const plan: PlanDetail = {
    id,
    name: input.name,
    status: "active",
    frequency: input.frequency,
    amount: money(amount),
    totalDebits: input.totalDebits,
    startDate: input.startDate,
    endDate: dates[dates.length - 1]!,
    saved: money(amount * BigInt(paid)),
    target: money(amount * BigInt(input.totalDebits)),
    paidDebits: paid,
    failedDebits: 0,
    nextDebit: null,
    topupFromBank: input.topupFromBank === true,
    payout: null,
    penalty: money(0n),
    createdAt: new Date().toISOString(),
    closedAt: null,
    earlyWithdrawalPenaltyBps: 0,
    schedule: dates.map((dueOn, i) => ({
      seq: i + 1,
      dueOn,
      status: (i < paid ? "paid" : "scheduled") as DebitStatus,
    })),
    history,
  };
  return refresh(plan);
}

/** Works out what follows from the schedule, the way the server's view does. */
function refresh(plan: PlanDetail): PlanDetail {
  const next = plan.schedule.find((d) => d.status === "scheduled");
  const open = plan.status === "active" || plan.status === "paused";
  return {
    ...plan,
    paidDebits: plan.schedule.filter((d) => d.status === "paid").length,
    failedDebits: plan.schedule.filter((d) => d.status === "failed").length,
    nextDebit: open && next ? { dueOn: next.dueOn, amount: plan.amount } : null,
  };
}

const ok = <T>(data: T): Outcome<T> => ({ ok: true, data });
const no = (message: string, code?: string): Outcome<never> => ({
  ok: false,
  failure: { kind: "refused", status: 409, code, message } satisfies Failure,
});

/** A pretend server for walking the saving screens: nothing is sent, and it is gone when the tab is. */
export function previewGateway(currency: string): SavingsGateway {
  const store = fresh(currency);
  const find = (id: string) => store.plans.find((p) => p.id === id);
  const replace = (plan: PlanDetail) => {
    store.plans = store.plans.map((p) => (p.id === plan.id ? plan : p));
    return plan;
  };
  const money = (n: bigint) => ({ amount: n.toString(), currency });
  const toPlan = (detail: PlanDetail): Plan => ({
    id: detail.id,
    name: detail.name,
    status: detail.status,
    frequency: detail.frequency,
    amount: detail.amount,
    totalDebits: detail.totalDebits,
    startDate: detail.startDate,
    endDate: detail.endDate,
    saved: detail.saved,
    target: detail.target,
    paidDebits: detail.paidDebits,
    failedDebits: detail.failedDebits,
    nextDebit: detail.nextDebit,
    topupFromBank: detail.topupFromBank,
    payout: detail.payout,
    penalty: detail.penalty,
    createdAt: detail.createdAt,
    closedAt: detail.closedAt,
  });

  return {
    get sampleWallet() {
      return store.wallet.toString();
    },
    list: async () => ok(store.plans.map(toPlan)),
    get: async (id) => {
      const plan = find(id);
      return plan ? ok(plan) : no("We couldn't find that plan.");
    },
    preview: async (input) => {
      const dates = scheduleDates(input.startDate, input.frequency, input.totalDebits);
      return ok({
        dates,
        total: money(BigInt(input.amount) * BigInt(input.totalDebits)),
        endDate: dates[dates.length - 1]!,
      });
    },
    create: async (input) => {
      const plan = build(store, currency, todayIn(currency), input);
      store.plans = [plan, ...store.plans];
      return ok(plan);
    },
    pause: async (id) => {
      const plan = find(id);
      if (!plan) return no("We couldn't find that plan.");
      return ok(replace(refresh({ ...plan, status: "paused" })));
    },
    resume: async (id) => {
      const plan = find(id);
      if (!plan) return no("We couldn't find that plan.");
      return ok(replace(refresh({ ...plan, status: "active" })));
    },
    topUp: async (id, amount) => {
      const plan = find(id);
      if (!plan) return no("We couldn't find that plan.");
      if (BigInt(amount) > store.wallet) {
        return no("You don't have enough in your wallet for that.", "insufficient_funds");
      }
      store.wallet -= BigInt(amount);
      return ok(
        replace(
          refresh({
            ...plan,
            saved: money(BigInt(plan.saved.amount) + BigInt(amount)),
            history: [
              {
                type: "savings_topup",
                direction: "in",
                amount: money(BigInt(amount)),
                createdAt: new Date().toISOString(),
              },
              ...plan.history,
            ],
          }),
        ),
      );
    },
    endEarly: async (id) => {
      const plan = find(id);
      if (!plan) return no("We couldn't find that plan.");
      const saved = BigInt(plan.saved.amount);
      store.wallet += saved;
      return ok(
        replace(
          refresh({
            ...plan,
            status: "cancelled",
            saved: money(0n),
            payout: money(saved),
            closedAt: new Date().toISOString(),
            schedule: plan.schedule.map((d) =>
              d.status === "scheduled" ? { ...d, status: "skipped" as const } : d,
            ),
          }),
        ),
      );
    },
    takeNextDebit: async (id) => {
      const plan = find(id);
      if (!plan || plan.status !== "active") return no("That plan isn't taking debits.");
      const next = plan.schedule.find((d) => d.status === "scheduled");
      if (!next) return no("There are no debits left.");
      const amount = BigInt(plan.amount.amount);
      if (store.wallet < amount) return no("The sample wallet is empty.", "insufficient_funds");
      store.wallet -= amount;
      const schedule = plan.schedule.map((d) =>
        d === next ? { ...d, status: "paid" as const } : d,
      );
      let updated = refresh({
        ...plan,
        schedule,
        saved: money(BigInt(plan.saved.amount) + amount),
        history: [
          {
            type: "savings_debit",
            direction: "in",
            amount: money(amount),
            createdAt: new Date().toISOString(),
          },
          ...plan.history,
        ],
      });
      if (!updated.schedule.some((d) => d.status === "scheduled")) {
        const total = BigInt(updated.saved.amount);
        store.wallet += total;
        updated = refresh({
          ...updated,
          status: "completed",
          saved: money(0n),
          payout: money(total),
          closedAt: new Date().toISOString(),
        });
      }
      return ok(replace(updated));
    },
  };
}
