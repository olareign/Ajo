import { previewGateway } from "./savings-gateway";
import { todayIn } from "./schedule";

const input = (over = {}) => ({
  name: "Phone",
  amount: "1000000",
  frequency: "monthly" as const,
  totalDebits: 3,
  startDate: todayIn("NGN"),
  ...over,
});

describe("the pretend server for previews", () => {
  it("starts with one sample plan that is part paid, and a sample wallet", async () => {
    const gw = previewGateway("NGN");
    const list = await gw.list();
    expect(list).toMatchObject({ ok: true });
    if (!list.ok) return;
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({
      name: "Rent",
      status: "active",
      paidDebits: 5,
      totalDebits: 12,
    });
    expect(list.data[0]).not.toHaveProperty("schedule");
    expect(gw.sampleWallet).toBe("4500000");
  });

  it("uses pounds for the UK", async () => {
    const list = await previewGateway("GBP").list();
    expect(list.ok && list.data[0]!.amount).toEqual({ amount: "2500", currency: "GBP" });
  });

  it("makes a plan the same way the server would, and shows it first in the list", async () => {
    const gw = previewGateway("NGN");
    const made = await gw.create(input(), "k");
    if (!made.ok) throw new Error("expected a plan");
    expect(made.data.schedule).toHaveLength(3);
    expect(made.data.target).toEqual({ amount: "3000000", currency: "NGN" });
    expect(made.data.nextDebit?.dueOn).toBe(made.data.schedule[0]!.dueOn);
    const list = await gw.list();
    expect(list.ok && list.data[0]!.id).toBe(made.data.id);
    const preview = await gw.preview(input());
    expect(preview.ok && preview.data.total).toEqual({ amount: "3000000", currency: "NGN" });
  });

  it("takes debits from the sample wallet, and pays the plan out when the last one is taken", async () => {
    const gw = previewGateway("NGN");
    const made = await gw.create(input({ amount: "1000000", totalDebits: 2 }), "k");
    if (!made.ok) throw new Error("x");
    await gw.takeNextDebit!(made.data.id);
    expect(gw.sampleWallet).toBe("3500000");
    const done = await gw.takeNextDebit!(made.data.id);
    if (!done.ok) throw new Error("x");
    expect(done.data).toMatchObject({
      status: "completed",
      saved: { amount: "0" },
      payout: { amount: "2000000" },
      nextDebit: null,
    });
    expect(gw.sampleWallet).toBe("4500000");
    expect((await gw.takeNextDebit!(made.data.id)).ok).toBe(false);
  });

  it("will not take a debit the wallet cannot cover", async () => {
    const gw = previewGateway("NGN");
    const made = await gw.create(input({ amount: "5000000" }), "k");
    if (!made.ok) throw new Error("x");
    const refused = await gw.takeNextDebit!(made.data.id);
    expect(refused).toMatchObject({ ok: false, failure: { code: "insufficient_funds" } });
  });

  it("tops up, refuses more than the wallet holds, pauses and resumes, and ends early", async () => {
    const gw = previewGateway("NGN");
    const made = await gw.create(input(), "k");
    if (!made.ok) throw new Error("x");
    const id = made.data.id;
    const topped = await gw.topUp(id, "200000", "k2");
    expect(topped.ok && topped.data.saved.amount).toBe("200000");
    expect(topped.ok && topped.data.history[0]!.type).toBe("savings_topup");
    expect(await gw.topUp(id, "999999999", "k3")).toMatchObject({
      ok: false,
      failure: { code: "insufficient_funds" },
    });
    const paused = await gw.pause(id);
    expect(paused.ok && paused.data.status).toBe("paused");
    const resumed = await gw.resume(id);
    expect(resumed.ok && resumed.data.status).toBe("active");
    const ended = await gw.endEarly(id, "123456");
    if (!ended.ok) throw new Error("x");
    expect(ended.data).toMatchObject({
      status: "cancelled",
      saved: { amount: "0" },
      payout: { amount: "200000" },
      nextDebit: null,
    });
    expect(ended.data.schedule.every((d) => d.status === "skipped")).toBe(true);
    expect(gw.sampleWallet).toBe("4500000");
  });

  it("says it could not find a plan it never made", async () => {
    const gw = previewGateway("NGN");
    expect(await gw.get("nope")).toMatchObject({ ok: false });
    expect(await gw.pause("nope")).toMatchObject({ ok: false });
  });

  it("keeps each tab's preview to itself", async () => {
    const a = previewGateway("NGN");
    const b = previewGateway("NGN");
    await a.create(input(), "k");
    const listB = await b.list();
    expect(listB.ok && listB.data).toHaveLength(1);
  });
});
