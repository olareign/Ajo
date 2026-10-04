"use client";

import { Check, Glasses, Sun, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { StepProps } from "./types";

const PROMPTS = [
  "Look straight at the camera",
  "Slowly turn your head left",
  "Now give us a smile",
];
const PROMPT_MS = 1300;

/** Three arcs round the face that light up as each movement is done. */
function arc(from: number, to: number): string {
  const [cx, cy, rx, ry] = [120, 140, 102, 128];
  const at = (deg: number) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return `${(cx + rx * Math.cos(t)).toFixed(1)} ${(cy + ry * Math.sin(t)).toFixed(1)}`;
  };
  return `M ${at(from)} A ${rx} ${ry} 0 0 1 ${at(to)}`;
}
const ARCS = [arc(8, 112), arc(128, 232), arc(248, 352)];

function Viewfinder({ lit }: Readonly<{ lit: number }>) {
  return (
    <svg
      viewBox="0 0 240 290"
      role="img"
      aria-label="Camera frame: keep your face inside the oval"
      className="mx-auto w-56 max-w-full"
    >
      <ellipse cx="120" cy="140" rx="102" ry="128" className="fill-primary-tint" />
      <circle cx="120" cy="116" r="40" className="fill-primary/25" />
      <path
        d="M44 252 C52 196 84 176 120 176 C156 176 188 196 196 252 Z"
        className="fill-primary/25"
      />
      {ARCS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className={i < lit ? "stroke-primary" : "stroke-line-strong"}
          style={{ opacity: i < lit ? 1 : 0.55, transition: "opacity 300ms" }}
        />
      ))}
    </svg>
  );
}

/**
 * A short live selfie. The capture itself belongs to the identity partner's camera component; these
 * are the frame, the movements asked for, and the waiting. Today only reached in a preview, which
 * never asks for the camera.
 */
export function SelfieStep({ submit }: StepProps) {
  const [phase, setPhase] = useState<"intro" | "scan" | "checking">("intro");
  const [lit, setLit] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (phase !== "scan") return;
    const timer = setTimeout(() => {
      if (lit < PROMPTS.length) setLit(lit + 1);
      else setPhase("checking");
    }, PROMPT_MS);
    return () => clearTimeout(timer);
  }, [phase, lit]);

  useEffect(() => {
    if (phase !== "checking") return;
    let current = true;
    (async () => {
      const outcome = await submit({});
      if (!current || outcome.ok) return;
      setError(outcome.message);
      setPhase("intro");
      setLit(0);
    })();
    return () => {
      current = false;
    };
  }, [phase, submit]);

  return (
    <div className="grid gap-6">
      <Viewfinder lit={lit} />
      {phase === "intro" && (
        <>
          <ul className="grid gap-2 text-[15px]">
            {[
              [Sun, "Good light on your face"],
              [Glasses, "No hat or sunglasses"],
              [User, "Phone at eye level, arm's length"],
            ].map(([Icon, text]) => {
              const I = Icon as typeof Sun;
              return (
                <li key={text as string} className="flex items-center gap-3 text-ink-muted">
                  <I aria-hidden className="size-5 text-primary" />
                  {text as string}
                </li>
              );
            })}
          </ul>
          {error && (
            <p role="alert" className="text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          <Button size="lg" block onClick={() => setPhase("scan")}>
            I&apos;m ready
          </Button>
        </>
      )}
      {phase === "scan" && (
        <p role="status" className="text-center font-display text-[22px] leading-7 font-semibold">
          {PROMPTS[Math.min(lit, PROMPTS.length - 1)]}
        </p>
      )}
      {phase === "checking" && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 text-center text-ink-muted"
        >
          <Check aria-hidden className="size-5 text-primary" />
          Checking it&apos;s really you…
        </p>
      )}
    </div>
  );
}
