"use client";

import { MeGate } from "./MeGate";
import { Onboarding } from "./Onboarding";

export function OnboardingScreen({ photos }: Readonly<{ photos: readonly string[] }>) {
  return <MeGate needs="not-onboarded">{(me) => <Onboarding me={me} photos={photos} />}</MeGate>;
}
