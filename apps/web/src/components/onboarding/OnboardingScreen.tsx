"use client";

import { MeGate } from "./MeGate";
import { Onboarding } from "./Onboarding";

export function OnboardingScreen() {
  return <MeGate needs="not-onboarded">{(me) => <Onboarding name={me.displayName} />}</MeGate>;
}
