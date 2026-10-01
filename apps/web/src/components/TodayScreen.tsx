"use client";

import { MeGate } from "@/components/onboarding/MeGate";

export function TodayScreen() {
  return (
    <MeGate needs="onboarded">
      {(me) => (
        <main className="mx-auto w-full max-w-md px-4 pt-10 pb-28">
          <h1 className="font-display text-[32px] leading-9 font-bold tracking-[-0.015em]">
            Hello, {me.displayName}
          </h1>
          <p className="mt-3 text-ink-muted">
            Nothing needs you yet. Your circles will show up here.
          </p>
        </main>
      )}
    </MeGate>
  );
}
