"use client";

import { MeGate } from "@/components/onboarding/MeGate";
import { MfaOn } from "./MfaOn";
import { MfaSetup } from "./MfaSetup";

/** The second lock: set it up if it is off, manage it if it is on. */
export function SecurityScreen() {
  return <MeGate needs="onboarded">{(me) => (me.mfaEnabled ? <MfaOn /> : <MfaSetup />)}</MeGate>;
}
