import { money } from "@ajo/domain";
import {
  AMOUNT_PRESETS,
  amountError,
  canProceed,
  createWizardState,
  resolvedAmount,
  resolvedDuration,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from "./wizard";

const initialWizardState = createWizardState("NGN");
const run = (...actions: WizardAction[]): WizardState =>
  actions.reduce(wizardReducer, initialWizardState);

describe("solo plan wizard", () => {
  it("saves in the currency it was created with", () => {
    expect(resolvedAmount(run({ type: "chooseAmount", choice: "100" }))).toEqual(
      money(10_000, "NGN"),
    );
    const pounds = wizardReducer(createWizardState("GBP"), { type: "chooseAmount", choice: "100" });
    expect(resolvedAmount(pounds)).toEqual(money(10_000, "GBP"));
  });

  it("starts by asking what the user is saving for", () => {
    expect(initialWizardState.step).toBe("name");
    expect(canProceed(initialWizardState)).toBe(false);
  });

  it("needs a plan name before moving on", () => {
    expect(canProceed(run({ type: "setName", name: "   " }))).toBe(false);
    const named = run({ type: "setName", name: "Aso Ebi" });
    expect(canProceed(named)).toBe(true);
    expect(wizardReducer(named, { type: "next" }).step).toBe("amount");
  });

  it("does not move on while the current step is incomplete", () => {
    expect(run({ type: "next" }).step).toBe("name");
  });

  it("offers the amount presets from the designs", () => {
    expect(AMOUNT_PRESETS).toEqual([5_000, 10_000, 15_000, 20_000]);
  });

  it("needs both an amount and a frequency on the second screen", () => {
    const base = [{ type: "setName", name: "Aso Ebi" }, { type: "next" }] as const;
    expect(canProceed(run(...base))).toBe(false);
    expect(canProceed(run(...base, { type: "chooseAmount", choice: "5000" }))).toBe(false);
    const ready = run(
      ...base,
      { type: "chooseAmount", choice: "5000" },
      { type: "chooseFrequency", frequency: "weekly" },
    );
    expect(canProceed(ready)).toBe(true);
    expect(resolvedAmount(ready)).toEqual(money(500_000, "NGN"));
  });

  it("accepts a typed amount when the user picks Specify Amount", () => {
    const state = run(
      { type: "chooseAmount", choice: "custom" },
      { type: "setCustomAmount", text: "12,500" },
    );
    expect(resolvedAmount(state)).toEqual(money(1_250_000, "NGN"));
    expect(amountError(state)).toBeNull();
  });

  it("explains an invalid typed amount", () => {
    const state = run(
      { type: "chooseAmount", choice: "custom" },
      { type: "setCustomAmount", text: "12.345" },
    );
    expect(resolvedAmount(state)).toBeNull();
    expect(amountError(state)).toBe("Enter an amount like 5,000 or 5,000.50");
  });

  it("does not complain before anything is typed", () => {
    expect(amountError(run({ type: "chooseAmount", choice: "custom" }))).toBeNull();
  });

  it("rejects a zero amount", () => {
    const state = run(
      { type: "chooseAmount", choice: "custom" },
      { type: "setCustomAmount", text: "0" },
    );
    expect(resolvedAmount(state)).toBeNull();
    expect(amountError(state)).toBe("Enter an amount like 5,000 or 5,000.50");
  });

  it("asks how long to save for, with presets or a number of months", () => {
    expect(resolvedDuration(run({ type: "chooseDuration", choice: "12" }))).toEqual({
      unit: "months",
      count: 12,
    });
    const custom = run(
      { type: "chooseDuration", choice: "custom" },
      { type: "setCustomDuration", text: "9" },
    );
    expect(resolvedDuration(custom)).toEqual({ unit: "months", count: 9 });
    expect(
      resolvedDuration(
        run({ type: "chooseDuration", choice: "custom" }, { type: "setCustomDuration", text: "0" }),
      ),
    ).toBeNull();
    expect(resolvedDuration(initialWizardState)).toBeNull();
  });

  it("walks through every step to the review, and back again", () => {
    const review = run(
      { type: "setName", name: "Aso Ebi" },
      { type: "next" },
      { type: "chooseAmount", choice: "5000" },
      { type: "chooseFrequency", frequency: "weekly" },
      { type: "next" },
      { type: "chooseDuration", choice: "12" },
      { type: "next" },
    );
    expect(review.step).toBe("review");
    expect(canProceed(review)).toBe(true);
    expect(wizardReducer(review, { type: "back" }).step).toBe("duration");
    expect(wizardReducer(review, { type: "next" }).step).toBe("done");
  });

  it("keeps answers when going back", () => {
    const state = run({ type: "setName", name: "Aso Ebi" }, { type: "next" }, { type: "back" });
    expect(state).toMatchObject({ step: "name", name: "Aso Ebi" });
  });

  it("goes no further back than the first step or forward past done", () => {
    expect(run({ type: "back" }).step).toBe("name");
    const done: WizardState = { ...initialWizardState, step: "done" };
    expect(wizardReducer(done, { type: "next" }).step).toBe("done");
    expect(canProceed(done)).toBe(false);
  });
});
