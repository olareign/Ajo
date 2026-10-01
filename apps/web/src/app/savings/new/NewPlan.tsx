"use client";

import { SoloPlanWizard } from "@/features/solo-plan/SoloPlanWizard";

export function NewPlan({ today }: Readonly<{ today: string }>) {
  return (
    <SoloPlanWizard
      currency="NGN"
      locale="en-NG"
      today={today}
      // TODO(E4.1): POST /api/v1/solo-plans once the API and auto-debit mandate exist.
      onCreate={() => {}}
    />
  );
}
