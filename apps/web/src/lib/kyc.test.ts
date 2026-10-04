import {
  emptyKyc,
  nextStep,
  previewState,
  REQUIRED_STEPS,
  settle,
  stamped,
  summarise,
  type KycState,
} from "./kyc";

const approved = (state: KycState, steps: readonly string[]) =>
  steps.reduce((s, step) => settle(s, step as never, "approved"), state);

describe("summarise", () => {
  it("is not started with nothing done", () => {
    expect(summarise(emptyKyc("NG", true).steps)).toEqual({ status: "not_started", tier: 0 });
  });

  it("counts a rejection before a wait, and only the required steps decide", () => {
    let state = emptyKyc("NG", true);
    state = settle(state, "id", "rejected", "No match");
    state = settle(state, "selfie", "pending");
    expect(state.status).toBe("rejected");
    state = settle(emptyKyc("NG", true), "national_check", "rejected", "No match");
    expect(state.status).toBe("not_started");
  });

  it("approves only when every required step is approved, and reaches tier 2 with the national check", () => {
    let state = approved(emptyKyc("NG", true), REQUIRED_STEPS.slice(0, 4));
    expect(state.status).toBe("in_progress");
    state = settle(state, "bank", "approved");
    expect(state).toMatchObject({ status: "approved", tier: 1 });
    expect(settle(state, "national_check", "approved").tier).toBe(2);
  });

  it("has no tier 2 without approval", () => {
    expect(settle(emptyKyc("NG", true), "national_check", "approved").tier).toBe(0);
  });
});

describe("nextStep", () => {
  it("is the first required step still to do, in order", () => {
    let state = emptyKyc("NG", true);
    expect(nextStep(state)).toBe("id");
    state = settle(state, "id", "approved");
    expect(nextStep(state)).toBe("selfie");
  });

  it("skips a step that is waiting, and comes back to a refused one", () => {
    let state = settle(emptyKyc("NG", true), "id", "pending");
    expect(nextStep(state)).toBe("selfie");
    state = settle(
      approved(emptyKyc("NG", true), ["id", "selfie"]),
      "address",
      "rejected",
      "Blurry",
    );
    expect(nextStep(state)).toBe("address");
  });

  it("is nothing once every required step is decided", () => {
    expect(nextStep(approved(emptyKyc("NG", true), REQUIRED_STEPS))).toBeNull();
  });
});

describe("previewState", () => {
  it.each([
    ["fresh", "not_started", 0],
    ["waiting", "pending", 2],
    ["refused", "rejected", 1],
    ["approved", "approved", 5],
    ["approved_plus", "approved", 5],
  ] as const)("%s looks like %s with %i stamped", (kind, status, count) => {
    const state = previewState(kind, "NG");
    expect(state.status).toBe(status);
    expect(stamped(state)).toBe(count);
  });

  it("reaches tier 2 only with the extra stamp, and says why a refusal happened", () => {
    expect(previewState("approved", "NG").tier).toBe(1);
    expect(previewState("approved_plus", "NG").tier).toBe(2);
    expect(previewState("refused", "NG").steps.find((s) => s.step === "selfie")?.reason).toMatch(
      /too dark/,
    );
  });

  it("is always a connected preview", () => {
    expect(previewState("fresh", "GB").connected).toBe(true);
  });
});
