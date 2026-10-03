"use client";

import { useEffect, useState } from "react";
import { CircleRing } from "@/components/CircleRing";
import { SAMPLE_CIRCLE } from "@/lib/sample-circle";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const RESTING_TURN = 2;

const firstName = (name: string) => name.split(" ")[0]!;

/**
 * An èsúsú circle of eight: the gold ring moves from person to person, round by round, so the idea
 * ("each round the whole pot goes to one member") is seen before it is read. For someone who asked for
 * less motion it holds on one round.
 */
export function CircleScene({ photos }: Readonly<{ photos: readonly string[] }>) {
  const reduced = useReducedMotion();
  const [turn, setTurn] = useState(RESTING_TURN);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setTurn((t) => (t + 1) % SAMPLE_CIRCLE.length), 1400);
    return () => clearInterval(id);
  }, [reduced]);

  const recipient = reduced ? RESTING_TURN : turn;
  return (
    <div className="grid justify-items-center gap-3">
      <CircleRing
        members={SAMPLE_CIRCLE.map((member, i) => ({
          name: member.name,
          status: "paid",
          photo: photos[i],
        }))}
        recipient={recipient}
        title="An example circle of eight"
        center={{ label: `ROUND ${recipient + 1}`, value: "₦80,000" }}
        size={236}
      />
      <p
        key={recipient}
        className="motion-rise rounded-full bg-oro px-4 py-1.5 text-[14px] font-semibold text-on-oro"
      >
        {firstName(SAMPLE_CIRCLE[recipient]!.name)} takes the pot
      </p>
    </div>
  );
}
