import type { Country } from "./kyc-config";

export const REQUIRED_STEPS = ["id", "selfie", "address", "location", "bank"] as const;
export type StepKey = (typeof REQUIRED_STEPS)[number] | "national_check";
export const ALL_STEPS: readonly StepKey[] = [...REQUIRED_STEPS, "national_check"];

export type StepStatus = "not_started" | "pending" | "approved" | "rejected";
export type KycStatus = "not_started" | "in_progress" | "pending" | "approved" | "rejected";

export type StepState = Readonly<{
  step: StepKey;
  required: boolean;
  status: StepStatus;
  reason: string | null;
}>;

/** What `GET /api/kyc` sends, and what a preview keeps in memory. */
export type KycState = Readonly<{
  connected: boolean;
  country: Country | null;
  status: KycStatus;
  tier: 0 | 1 | 2;
  steps: readonly StepState[];
  /** Where status comes from: the checks, an approval given without them, or a hold. */
  via?: "checks" | "waived" | "hold";
  /** A sentence from the API for when status is not from the checks. */
  note?: string | null;
}>;

/**
 * Overall status and tier from the steps. This mirrors the API, which is the authority for real
 * people; the web uses it only for the preview, which has no API behind it.
 */
export function summarise(steps: readonly StepState[]): Pick<KycState, "status" | "tier"> {
  const required = steps.filter((s) => s.required);
  let status: KycStatus;
  if (required.some((s) => s.status === "rejected")) status = "rejected";
  else if (required.every((s) => s.status === "approved")) status = "approved";
  else if (required.some((s) => s.status === "pending")) status = "pending";
  else if (required.some((s) => s.status === "approved")) status = "in_progress";
  else status = "not_started";
  const national = steps.find((s) => s.step === "national_check");
  return { status, tier: status !== "approved" ? 0 : national?.status === "approved" ? 2 : 1 };
}

export function emptyKyc(country: Country | null, connected: boolean): KycState {
  const steps = ALL_STEPS.map((step): StepState => ({
    step,
    required: step !== "national_check",
    status: "not_started",
    reason: null,
  }));
  return { connected, country, steps, ...summarise(steps) };
}

/** A new state with one step decided, and the overall status worked out again. */
export function settle(
  state: KycState,
  step: StepKey,
  status: Exclude<StepStatus, "not_started">,
  reason: string | null = null,
): KycState {
  const steps = state.steps.map((s) => (s.step === step ? { ...s, status, reason } : s));
  return { ...state, steps, ...summarise(steps) };
}

/** The step to send the person to next: the first required one that is not approved or waiting. */
export function nextStep(state: KycState): StepKey | null {
  const todo = state.steps.find(
    (s) => s.required && (s.status === "not_started" || s.status === "rejected"),
  );
  return todo?.step ?? null;
}

export const stepOf = (state: KycState, step: StepKey): StepState =>
  state.steps.find((s) => s.step === step)!;

export type PreviewKind = "fresh" | "waiting" | "refused" | "approved" | "approved_plus";

/** Sample progress for the preview, so each outcome a person could meet can be looked at. */
export function previewState(kind: PreviewKind, country: Country | null): KycState {
  let state = emptyKyc(country, true);
  const decide = (steps: readonly StepKey[], status: "approved" | "pending") => {
    for (const step of steps) state = settle(state, step, status);
  };
  if (kind === "waiting") {
    decide(["id", "selfie"], "approved");
    decide(["address"], "pending");
  }
  if (kind === "refused") {
    decide(["id"], "approved");
    state = settle(
      state,
      "selfie",
      "rejected",
      "The photo was too dark. Try again in better light.",
    );
  }
  if (kind === "approved" || kind === "approved_plus") decide(REQUIRED_STEPS, "approved");
  if (kind === "approved_plus") decide(["national_check"], "approved");
  return state;
}

/** How many of the required steps are stamped. */
export const stamped = (state: KycState): number =>
  state.steps.filter((s) => s.required && s.status === "approved").length;
