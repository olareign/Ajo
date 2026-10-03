"use client";

import { useEffect, useState } from "react";
import { Amount } from "@/components/ui/Amount";
import { Stitches } from "@/components/ui/Stitches";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const WEEKS = 10;
/** ₦15,000 a week toward ₦150,000, in kobo like every amount in the app. */
const PER_WEEK = 1_500_000;
const RESTING_WEEK = 7;

/**
 * A savings goal filling up: each week a coin lands on the card and one more stitch is sewn. It loops
 * quietly; for someone who asked for less motion it simply shows week seven.
 */
export function SoloScene() {
  const reduced = useReducedMotion();
  const [week, setWeek] = useState(1);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setWeek((w) => (w >= 8 ? 1 : w + 1)), 1100);
    return () => clearInterval(id);
  }, [reduced]);

  const shown = reduced ? RESTING_WEEK : week;
  return (
    <div className="relative w-[256px]">
      {!reduced && (
        <span
          key={shown}
          className="scene-coin absolute -top-4 -right-3 z-10 grid size-12 place-items-center rounded-full bg-oro font-display text-[22px] font-bold text-on-oro shadow-lift"
        >
          ₦
        </span>
      )}
      <div className="grid gap-4 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift">
        <p className="text-[13px] font-semibold tracking-[0.04em] text-ink-muted">NEW PHONE</p>
        <div className="grid gap-1">
          <Amount amount={String(shown * PER_WEEK)} currency="NGN" size="xl" />
          <p className="text-[13px] text-ink-muted">saved of ₦150,000</p>
        </div>
        <Stitches
          total={WEEKS}
          done={shown}
          label="Savings goal"
          caption={`Week ${shown} of ${WEEKS}`}
        />
      </div>
    </div>
  );
}
