import { multiply, parseMajor, type Duration, type Frequency, type Money } from "@ajo/domain";

/** Steps follow the "SELECT SAVINGS" screens in Figma, then a review and a success screen. */
export const STEPS = ["name", "amount", "duration", "review", "done"] as const;
export type Step = (typeof STEPS)[number];

/** Whole units of the plan currency, as shown on the chips (5,000 / 10,000 / ...). */
export const AMOUNT_PRESETS = [5_000, 10_000, 15_000, 20_000] as const;

/** Durations in months: 3 Months, 6 Months, 1 year, 2 years. */
export const DURATION_PRESETS = [3, 6, 12, 24] as const;

export type WizardState = Readonly<{
  currency: string;
  step: Step;
  name: string;
  /** A preset in whole units ("5000"), or "custom". */
  amountChoice: string | null;
  customAmount: string;
  frequency: Frequency | null;
  /** A preset in months ("12"), or "custom". */
  durationChoice: string | null;
  customDuration: string;
}>;

export type WizardAction =
  | { type: "setName"; name: string }
  | { type: "chooseAmount"; choice: string }
  | { type: "setCustomAmount"; text: string }
  | { type: "chooseFrequency"; frequency: Frequency }
  | { type: "chooseDuration"; choice: string }
  | { type: "setCustomDuration"; text: string }
  | { type: "next" }
  | { type: "back" };

export function createWizardState(currency: string): WizardState {
  return {
    currency,
    step: "name",
    name: "",
    amountChoice: null,
    customAmount: "",
    frequency: null,
    durationChoice: null,
    customDuration: "",
  };
}

export function resolvedAmount(state: WizardState): Money | null {
  const { currency } = state;
  if (state.amountChoice === null) return null;
  try {
    const amount =
      state.amountChoice === "custom"
        ? parseMajor(state.customAmount, currency)
        : multiply(parseMajor("1", currency), Number(state.amountChoice));
    return amount.amount > 0 ? amount : null;
  } catch {
    return null;
  }
}

export function amountError(state: WizardState): string | null {
  if (state.amountChoice !== "custom" || state.customAmount.trim() === "") return null;
  return resolvedAmount(state) ? null : "Enter an amount like 5,000 or 5,000.50";
}

export function resolvedDuration(state: WizardState): Duration | null {
  if (state.durationChoice === null) return null;
  const text = state.durationChoice === "custom" ? state.customDuration : state.durationChoice;
  const months = /^\d+$/.test(text.trim()) ? Number(text) : 0;
  return months > 0 ? { unit: "months", count: months } : null;
}

export function canProceed(state: WizardState): boolean {
  switch (state.step) {
    case "name":
      return state.name.trim() !== "";
    case "amount":
      return resolvedAmount(state) !== null && state.frequency !== null;
    case "duration":
      return resolvedDuration(state) !== null;
    case "review":
      return true;
    case "done":
      return false;
  }
}

function move(state: WizardState, by: 1 | -1): WizardState {
  const index = STEPS.indexOf(state.step) + by;
  return { ...state, step: STEPS[Math.max(0, Math.min(index, STEPS.length - 1))]! };
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "setName":
      return { ...state, name: action.name };
    case "chooseAmount":
      return { ...state, amountChoice: action.choice };
    case "setCustomAmount":
      return { ...state, customAmount: action.text };
    case "chooseFrequency":
      return { ...state, frequency: action.frequency };
    case "chooseDuration":
      return { ...state, durationChoice: action.choice };
    case "setCustomDuration":
      return { ...state, customDuration: action.text };
    case "next":
      // An incomplete step (and "done") stays put.
      return canProceed(state) ? move(state, 1) : state;
    case "back":
      return state.step === "done" ? state : move(state, -1);
  }
}
