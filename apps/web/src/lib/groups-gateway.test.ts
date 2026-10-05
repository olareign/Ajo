import type { GroupInput } from "./groups-client";
import { previewGroups, roundDates } from "./groups-gateway";

const input = (over: Partial<GroupInput> = {}): GroupInput => ({
  name: "Test circle",
  contribution: "500000",
  frequency: "monthly",
  size: 4,
  startDate: "2030-01-15",
  orderMethod: "join_order",
  visibility: "public",
  ...over,
});

describe("round dates", () => {
  it("steps a week, two weeks, or a month at a time", () => {
    expect(roundDates("2030-01-01", "weekly", 3)).toEqual([
      "2030-01-01",
      "2030-01-08",
      "2030-01-15",
    ]);
    expect(roundDates("2030-01-01", "biweekly", 3)).toEqual([
      "2030-01-01",
      "2030-01-15",
      "2030-01-29",
    ]);
    expect(roundDates("2030-01-31", "monthly", 3)).toHaveLength(3);
  });
});

describe("the pretend circles server", () => {
  const server = () => previewGroups("NGN", "Ada Ola");
  const data = async <T>(p: Promise<{ ok: boolean; data?: T }>): Promise<T> => {
    const result = await p;
    if (!result.ok) throw new Error("expected success");
    return result.data as T;
  };

  it("starts with a circle under way and some open ones to find", async () => {
    const g = server();
    const mine = await data(g.list());
    expect(mine.map((c) => c.status)).toEqual(["running"]);
    const found = await data(g.discover());
    expect(found.length).toBeGreaterThanOrEqual(3);
    expect(found.every((c) => c.status === "open" && c.visibility === "public")).toBe(true);
  });

  it("shows the rounds of the running circle, two already paid out", async () => {
    const g = server();
    const [running] = await data(g.list());
    const detail = await data(g.get(running!.id));
    expect(detail.rounds.filter((r) => r.status === "paid_out")).toHaveLength(2);
    expect(detail.draws[0]?.seed).toMatch(/^[0-9a-f]{64}$/);
    expect(detail.nextDue?.roundNo).toBe(3);
  });

  it("works out the pot and deposits before anything is made", async () => {
    const view = await data(server().preview(input({ size: 6 })));
    expect(view.pot).toEqual({ amount: "3000000", currency: "NGN" });
    expect(view.dates).toHaveLength(6);
    expect(view.earlySpots).toBe(2);
  });

  it("fills, draws and starts when the last place is taken", async () => {
    const g = server();
    const made = await data(g.create(input({ orderMethod: "random", size: 3 }), "k"));
    expect(made.status).toBe("open");
    const full = await data(g.fillWithSamples!(made.id));
    expect(full.status).toBe("running");
    expect(full.memberCount).toBe(3);
    expect(full.draws).toHaveLength(1);
    expect(full.members.map((m) => m.spot).sort()).toEqual([1, 2, 3]);
    expect(full.rounds).toHaveLength(3);
  });

  it("gives turns by joining order when asked", async () => {
    const g = server();
    const made = await data(g.create(input({ size: 3 }), "k"));
    const full = await data(g.fillWithSamples!(made.id));
    expect(full.mySpot).toBe(1);
    expect(full.draws).toEqual([]);
  });

  it("opens picking, lets the person choose once, and refuses a taken or second pick", async () => {
    const g = server();
    const made = await data(g.create(input({ orderMethod: "pick", size: 3 }), "k"));
    const full = await data(g.fillWithSamples!(made.id));
    expect(full.status).toBe("picking");
    expect(full.pickDeadline).not.toBeNull();
    const done = await data(g.pick(made.id, 2));
    expect(done.status).toBe("running");
    expect(done.mySpot).toBe(2);
    const again = await g.pick(made.id, 3);
    expect(again.ok).toBe(false);
  });

  it("refuses to pick when picking is not open", async () => {
    const g = server();
    const made = await data(g.create(input(), "k"));
    const result = await g.pick(made.id, 1);
    expect(result).toMatchObject({ ok: false, failure: { code: "picking_closed" } });
  });

  it("joins by invite code, but not twice and not once it is full", async () => {
    const g = server();
    const [first] = await data(g.discover());
    const summary = first!;
    expect((await g.byCode("NOPE0000")).ok).toBe(false);
    const joined = await data(g.joinPublic(summary.id));
    expect(joined.isMember).toBe(true);
    const count = joined.memberCount;
    const twice = await data(g.joinPublic(summary.id));
    expect(twice.memberCount).toBe(count);
    const found = await data(g.discover());
    expect(found.some((c) => c.id === summary.id)).toBe(false);
  });

  it("lets a member leave, but a creator can only call it off, and a full circle neither", async () => {
    const g = server();
    const mine = await data(g.create(input({ size: 3 }), "k"));
    const leave = await g.leave(mine.id);
    expect(leave).toMatchObject({ ok: false, failure: { code: "creator_cannot_leave" } });
    const cancelled = await data(g.cancel(mine.id));
    expect(cancelled.status).toBe("cancelled");
    const [running] = await data(g.list());
    expect(await g.cancel(running!.id)).toMatchObject({
      ok: false,
      failure: { code: "group_locked" },
    });
    expect(await g.leave(running!.id)).toMatchObject({
      ok: false,
      failure: { code: "group_locked" },
    });
  });

  it("collects and pays out each round until the circle completes", async () => {
    const g = server();
    const [running] = await data(g.list());
    let detail = await data(g.get(running!.id));
    for (let i = 0; i < 4; i += 1) detail = await data(g.nextRound!(running!.id));
    expect(detail.status).toBe("completed");
    expect(await g.nextRound!(running!.id)).toMatchObject({ ok: false });
  });

  it("answers an unknown circle with not found", async () => {
    const result = await server().get("nope");
    expect(result).toMatchObject({ ok: false, failure: { status: 404 } });
  });

  it("does not offer swapping in a preview", async () => {
    const g = server();
    expect(await g.proposeSwap("x", "chidi_o")).toMatchObject({
      ok: false,
      failure: { code: "swap_unavailable" },
    });
    expect(await data(g.swaps("x"))).toEqual([]);
  });
});
