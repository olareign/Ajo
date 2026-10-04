import { useId } from "react";
import { cn } from "@/lib/cn";

type Tone = "active" | "paused" | "done" | "ended";

type Props = Readonly<{
  /** How full, from 0 to 1. */
  ratio: number;
  tone?: Tone;
  /** Pixels wide; it keeps its shape. */
  size?: number;
  /** Changes whenever a coin should fall in. */
  dropKey?: string | number;
  label?: string;
  className?: string;
}>;

const FILL: Record<Tone, string> = {
  active: "var(--oro)",
  paused: "#b9a46a",
  done: "var(--leaf)",
  ended: "#a4adb5",
};

/**
 * The saving pot: a clay jar that fills with gold as a plan is paid into. The fill's surface ripples,
 * and a coin drops in when `dropKey` changes. Motion stops for people who ask for less of it.
 */
export function Pot({ ratio, tone = "active", size = 160, dropKey, label, className }: Props) {
  const id = useId();
  const clamped = Math.min(1, Math.max(0, ratio));
  // The jar's belly runs from y=26 (the neck) to y=132 (the base).
  const top = 132 - clamped * 106;
  const percent = Math.round(clamped * 100);
  return (
    <svg
      role="img"
      aria-label={label ?? `Pot, ${percent}% full`}
      viewBox="0 0 120 150"
      width={size}
      height={(size * 150) / 120}
      className={cn("overflow-visible", className)}
    >
      <defs>
        <clipPath id={`${id}-body`}>
          <path d="M44 26 C44 36 17 46 17 84 C17 116 38 134 60 134 C82 134 103 116 103 84 C103 46 76 36 76 26 Z" />
        </clipPath>
      </defs>
      <ellipse cx="60" cy="142" rx="34" ry="5" fill="rgba(15,31,23,0.1)" />
      {/* the empty jar */}
      <path
        d="M44 26 C44 36 17 46 17 84 C17 116 38 134 60 134 C82 134 103 116 103 84 C103 46 76 36 76 26 Z"
        fill="var(--surface-sunken)"
        stroke="var(--line-strong)"
        strokeWidth="2"
      />
      {/* what has been saved */}
      <g clipPath={`url(#${id}-body)`}>
        <rect
          x="0"
          y={top}
          width="120"
          height="150"
          fill={FILL[tone]}
          style={{ transition: "y 0.8s ease" }}
        />
        {clamped > 0 && clamped < 1 && (
          <g style={{ transform: `translateY(${top - 6}px)`, transition: "transform 0.8s ease" }}>
            <path
              className="pot-wave"
              d="M0 6 Q15 0 30 6 T60 6 T90 6 T120 6 T150 6 T180 6 V16 H0 Z"
              fill={FILL[tone]}
            />
          </g>
        )}
        {/* a soft highlight down the left side */}
        <path
          d="M30 70 C28 90 34 112 46 124"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {/* the stitched band and the rim */}
      <path
        d="M20 72 Q60 86 100 72"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeDasharray="4 4"
        fill="none"
      />
      <path
        d="M22 80 Q60 94 98 80"
        stroke="var(--tertiary)"
        strokeWidth="1.5"
        strokeDasharray="1 5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="38" y="16" width="44" height="11" rx="5.5" fill="var(--primary-deep)" />
      {dropKey !== undefined && (
        <circle
          key={dropKey}
          className="pot-coin"
          cx="60"
          cy="26"
          r="6.5"
          fill="var(--oro)"
          stroke="var(--oro-ink)"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}
