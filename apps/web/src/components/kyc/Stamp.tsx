import { useId } from "react";
import { cn } from "@/lib/cn";
import type { StepStatus } from "@/lib/kyc";

type Props = Readonly<{
  /** Short mark in the middle: ID, FACE, HOME. */
  label: string;
  /** What the stamp is for, in words, for the accessible name. */
  title: string;
  status: StepStatus;
  /** True only for the moment a stamp lands, so it thunks down; otherwise it is simply there. */
  fresh?: boolean;
  size?: number;
  className?: string;
}>;

const WORDS: Record<StepStatus, string> = {
  not_started: "not stamped yet",
  pending: "being checked",
  approved: "approved",
  rejected: "needs another try",
};

const RING: Record<StepStatus, string> = {
  not_started: "text-line-strong",
  pending: "text-tertiary",
  approved: "text-primary",
  rejected: "text-danger",
};

const AROUND: Record<StepStatus, string> = {
  not_started: "STAMP HERE · STAMP HERE · ",
  pending: "BEING CHECKED · BEING CHECKED · ",
  approved: "ÀJỌ VERIFIED · ÀJỌ VERIFIED · ",
  rejected: "TRY AGAIN · TRY AGAIN · ",
};

/** A small tilt that is the same every time for the same mark, like a real stamp pressed by hand. */
const tilt = (label: string) => ((label.charCodeAt(0) + label.length * 7) % 13) - 6;

/**
 * A passport stamp. Empty ones are a dashed outline waiting to be filled; approved ones are green
 * ink with a slightly rough edge. Colour is never the only signal: the ring text and the accessible
 * name both say the status.
 */
export function Stamp({ label, title, status, fresh = false, size = 96, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const pathId = `stamp-path-${uid}`;
  const filterId = `stamp-ink-${uid}`;
  const inked = status === "approved" || status === "rejected";
  const empty = status === "not_started";

  return (
    <svg
      role="img"
      aria-label={`${title}: ${WORDS[status]}`}
      data-status={status}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      style={{ "--tilt": `${inked ? tilt(label) : 0}deg` } as React.CSSProperties}
      className={cn(
        RING[status],
        inked && "rotate-[var(--tilt)]",
        fresh && "stamp-thunk",
        status === "pending" && "stamp-wait",
        className,
      )}
    >
      <defs>
        <path id={pathId} d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" />
        {inked && (
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
          </filter>
        )}
      </defs>
      <g filter={inked ? `url(#${filterId})` : undefined} opacity={empty ? 0.8 : 1}>
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="none"
          stroke="currentColor"
          strokeWidth={empty ? 2 : 3}
          strokeDasharray={empty ? "5 6" : undefined}
        />
        {!empty && (
          <circle cx="60" cy="60" r="29" fill="none" stroke="currentColor" strokeWidth="1.5" />
        )}
        {!empty && (
          <text
            fill="currentColor"
            fontSize="9.5"
            fontWeight="700"
            letterSpacing="1.6"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <textPath href={`#${pathId}`} startOffset="0">
              {AROUND[status]}
            </textPath>
          </text>
        )}
        <text
          x="60"
          y={empty ? 68 : 67}
          textAnchor="middle"
          fill="currentColor"
          fontSize={label.length > 3 ? 17 : 22}
          fontWeight="700"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {label}
        </text>
      </g>
    </svg>
  );
}
