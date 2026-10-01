import { describe, expect, it } from "vitest";
import {
  closePicking,
  createDrawSeed,
  joinOrder,
  openPicking,
  PickError,
  pickSpot,
  randomDraw,
  seededRandom,
  verifyDraw,
  type Member,
} from "./order";

const member = (id: string, trusted: boolean, joinedAt = "2026-10-01T10:00:00Z"): Member => ({
  id,
  trusted,
  joinedAt,
});

const spotsOf = (assignments: { memberId: string; spot: number }[]) =>
  Object.fromEntries(assignments.map((a) => [a.memberId, a.spot]));

describe("joinOrder", () => {
  it("gives spot 1 to the first to join, and so on", () => {
    const members = [
      member("cy", true, "2026-10-01T12:00:00Z"),
      member("ada", true, "2026-10-01T09:00:00Z"),
      member("bo", true, "2026-10-01T10:00:00Z"),
    ];
    expect(spotsOf(joinOrder(members))).toEqual({ ada: 1, bo: 2, cy: 3 });
  });

  it("keeps early spots for trusted members even if they joined later", () => {
    const members = [
      member("new1", false, "2026-10-01T08:00:00Z"),
      member("new2", false, "2026-10-01T09:00:00Z"),
      member("old1", true, "2026-10-01T10:00:00Z"),
      member("new3", false, "2026-10-01T11:00:00Z"),
    ];
    // 4 members -> 1 early spot
    const assignments = joinOrder(members);
    expect(spotsOf(assignments)).toEqual({ old1: 1, new1: 2, new2: 3, new3: 4 });
    expect(assignments.every((a) => !a.requiresEarlySpotDeposit)).toBe(true);
  });

  it("lets untrusted members fill early spots when there are not enough trusted ones, with a larger deposit", () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      member(`m${i}`, i === 5, `2026-10-01T${String(10 + i).padStart(2, "0")}:00:00Z`),
    );
    const assignments = joinOrder(members);
    const early = assignments.filter((a) => a.earlySpot);

    expect(early.map((a) => a.memberId)).toEqual(["m5", "m0", "m1"]);
    expect(early.map((a) => a.requiresEarlySpotDeposit)).toEqual([false, true, true]);
    expect(assignments.filter((a) => !a.earlySpot).every((a) => !a.requiresEarlySpotDeposit)).toBe(
      true,
    );
  });

  it("breaks join-time ties by member id so the order is stable", () => {
    expect(spotsOf(joinOrder([member("b", true), member("a", true)]))).toEqual({ a: 1, b: 2 });
  });
});

describe("member validation", () => {
  it("refuses a member list with duplicate ids", () => {
    const duplicated = [member("ada", true), member("ada", false)];
    expect(() => joinOrder(duplicated)).toThrow(/duplicate/i);
    expect(() => randomDraw(duplicated, createDrawSeed())).toThrow(/duplicate/i);
    expect(() => openPicking(duplicated)).toThrow(/duplicate/i);
  });
});

describe("seededRandom", () => {
  it("is reproducible from the same seed", () => {
    const a = seededRandom("00112233445566778899aabbccddeeff");
    const b = seededRandom("00112233445566778899aabbccddeeff");
    const seqA = Array.from({ length: 5 }, () => a(1000));
    const seqB = Array.from({ length: 5 }, () => b(1000));
    expect(seqA).toEqual(seqB);
  });

  it("stays within range", () => {
    const next = seededRandom(createDrawSeed());
    for (let i = 0; i < 1000; i++) {
      const n = next(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });

  it("stays unbiased and in range for very large ranges, where rejection sampling kicks in", () => {
    const next = seededRandom("00112233445566778899aabbccddeeff");
    const n = 2 ** 31 + 1;
    for (let i = 0; i < 50; i++) {
      expect(next(n)).toBeLessThan(n);
    }
  });

  it("needs a 128-bit hex seed", () => {
    expect(() => seededRandom("abc")).toThrow(/seed/i);
  });

  it("rejects an invalid range", () => {
    expect(() => seededRandom(createDrawSeed())(0)).toThrow(/range/i);
  });
});

describe("createDrawSeed", () => {
  it("creates a fresh 128-bit hex seed from a secure source", () => {
    const seed = createDrawSeed();
    expect(seed).toMatch(/^[0-9a-f]{32}$/);
    expect(createDrawSeed()).not.toBe(seed);
  });
});

describe("randomDraw", () => {
  const members = Array.from({ length: 10 }, (_, i) => member(`m${i}`, i < 4));
  const seed = "0f1e2d3c4b5a69788796a5b4c3d2e1f0";

  it("gives every member exactly one spot", () => {
    const { assignments } = randomDraw(members, seed);
    expect(assignments.map((a) => a.spot).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(new Set(assignments.map((a) => a.memberId)).size).toBe(10);
  });

  it("puts only trusted members in early spots when there are enough", () => {
    const { assignments } = randomDraw(members, seed);
    const early = assignments.filter((a) => a.earlySpot);
    expect(early).toHaveLength(3);
    expect(early.every((a) => ["m0", "m1", "m2", "m3"].includes(a.memberId))).toBe(true);
  });

  it("can be verified by any member from the logged seed, whatever order members are listed in", () => {
    const draw = randomDraw(members, seed);
    expect(verifyDraw([...members].reverse(), draw.seed, draw.assignments)).toBe(true);
  });

  it("detects a tampered result", () => {
    const draw = randomDraw(members, seed);
    const tampered = draw.assignments.map((a) =>
      a.spot === 1 ? { ...a, spot: 2 } : a.spot === 2 ? { ...a, spot: 1 } : a,
    );
    expect(verifyDraw(members, seed, tampered)).toBe(false);
    expect(verifyDraw(members, seed, draw.assignments.slice(1))).toBe(false);
  });

  it("produces different orders from different seeds", () => {
    const a = randomDraw(members, seed).assignments;
    const b = randomDraw(members, "ffeeddccbbaa99887766554433221100").assignments;
    expect(spotsOf(a)).not.toEqual(spotsOf(b));
  });
});

describe("finger pick", () => {
  const members = [
    member("trusted1", true),
    member("trusted2", true),
    member("new1", false),
    member("new2", false),
    member("new3", false),
    member("new4", false),
    member("new5", false),
  ];
  // 7 members -> 2 early spots

  it("lets a member pick an open spot", () => {
    const state = pickSpot(openPicking(members), "new1", 5);
    expect(state.picks.get(5)).toBe("new1");
  });

  it("is first come, first served", () => {
    const state = pickSpot(openPicking(members), "new1", 5);
    expect(() => pickSpot(state, "new2", 5)).toThrow(PickError);
    try {
      pickSpot(state, "new2", 5);
    } catch (error) {
      expect((error as PickError).code).toBe("spot_taken");
    }
  });

  it("allows one spot per member", () => {
    const state = pickSpot(openPicking(members), "new1", 5);
    expect(() => pickSpot(state, "new1", 6)).toThrow(
      expect.objectContaining({ code: "already_picked" }),
    );
  });

  it("rejects spots outside the group and people outside the group", () => {
    const state = openPicking(members);
    expect(() => pickSpot(state, "new1", 0)).toThrow(
      expect.objectContaining({ code: "out_of_range" }),
    );
    expect(() => pickSpot(state, "new1", 8)).toThrow(
      expect.objectContaining({ code: "out_of_range" }),
    );
    expect(() => pickSpot(state, "stranger", 3)).toThrow(
      expect.objectContaining({ code: "not_member" }),
    );
  });

  it("keeps early spots for trusted members while enough of them are still unplaced", () => {
    const state = openPicking(members);
    expect(() => pickSpot(state, "new1", 1)).toThrow(
      expect.objectContaining({ code: "early_spot_reserved" }),
    );
  });

  it("counts early spots already taken when deciding whether one is still reserved", () => {
    let state = pickSpot(openPicking(members), "trusted1", 1);
    expect(() => pickSpot(state, "new1", 2)).toThrow(
      expect.objectContaining({ code: "early_spot_reserved" }),
    );
    state = pickSpot(state, "trusted2", 5);
    expect(pickSpot(state, "new1", 2).picks.get(2)).toBe("new1");
  });

  it("opens an early spot to untrusted members once trusted members have chosen elsewhere", () => {
    let state = openPicking(members);
    state = pickSpot(state, "trusted1", 6);
    state = pickSpot(state, "trusted2", 7);
    state = pickSpot(state, "new1", 1);
    expect(state.picks.get(1)).toBe("new1");
  });

  it("does not change the previous state", () => {
    const before = openPicking(members);
    pickSpot(before, "new1", 5);
    expect(before.picks.size).toBe(0);
  });

  it("assigns unpicked spots at close, trusted members first into open early spots", () => {
    let state = openPicking(members);
    state = pickSpot(state, "new1", 7);
    state = pickSpot(state, "trusted1", 2);
    const assignments = closePicking(state, "0f1e2d3c4b5a69788796a5b4c3d2e1f0");
    const spots = spotsOf(assignments);

    expect(spots.new1).toBe(7);
    expect(spots.trusted1).toBe(2);
    expect(spots.trusted2).toBe(1);
    expect(Object.values(spots).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(assignments.every((a) => !a.requiresEarlySpotDeposit)).toBe(true);
  });

  it("flags untrusted members who end up in early spots", () => {
    let state = openPicking(members);
    state = pickSpot(state, "trusted1", 6);
    state = pickSpot(state, "trusted2", 7);
    state = pickSpot(state, "new1", 1);
    const assignments = closePicking(state, "0f1e2d3c4b5a69788796a5b4c3d2e1f0");
    const early = assignments.filter((a) => a.earlySpot);

    expect(early).toHaveLength(2);
    expect(early.every((a) => a.requiresEarlySpotDeposit)).toBe(true);
  });
});
