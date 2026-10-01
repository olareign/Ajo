import { useId } from "react";
import { cn } from "@/lib/cn";

export type RingMember = Readonly<{
  name: string;
  status?: "paid" | "pending" | "late" | "covered";
  /** A real photo of the member. Without one the bead shows their initials. */
  photo?: string;
}>;

type Props = Readonly<{
  members: readonly RingMember[];
  /** Index of this round's recipient, drawn in gold. */
  recipient?: number;
  /** Index of the signed-in member. */
  you?: number;
  center?: { label: string; value: string };
  title?: string;
  size?: number;
  className?: string;
  /** Rolls in like a wheel from the side, then settles. Respects reduced-motion. */
  roll?: boolean;
}>;

const WORD = { paid: "paid", pending: "pending", late: "late", covered: "covered" } as const;

const BEAD = {
  paid: "fill-leaf stroke-leaf [&+text]:fill-surface-raised",
  pending: "fill-surface-raised stroke-line-strong [&+text]:fill-ink",
  late: "fill-danger stroke-danger [&+text]:fill-surface-raised",
  covered: "fill-tertiary stroke-tertiary [&+text]:fill-on-tertiary",
  recipient: "fill-oro stroke-oro [&+text]:fill-on-oro",
} as const;

const RING = {
  paid: "stroke-leaf",
  pending: "stroke-line-strong",
  late: "stroke-danger",
  covered: "stroke-tertiary",
  recipient: "stroke-oro",
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** The circle: members as beads in spot order (spot 1 at the top, clockwise), recipient in gold. */
export function CircleRing({
  members,
  recipient,
  you,
  center,
  title,
  size = 240,
  className,
  roll = false,
}: Props) {
  const clipId = useId();
  const n = Math.max(members.length, 1);
  const R = 78;
  const C = 100;
  const bead = Math.max(9, Math.min(17, (2 * Math.PI * R) / n / 2.6));
  const description = members
    .map((m, i) => {
      const state = i === recipient ? "receives this round" : WORD[m.status ?? "pending"];
      return `${m.name}${i === you ? " (you)" : ""}: ${state}`;
    })
    .join("; ");

  return (
    <figure
      data-roll={roll ? "" : undefined}
      className={cn("m-0 aspect-square max-w-full", roll && "ring-roll", className)}
      style={{ width: size }}
    >
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`${title ? `${title}. ` : ""}${description}`}
        className="block h-auto w-full overflow-visible"
      >
        <g data-wheel="" className={roll ? "ring-wheel" : undefined}>
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            className="stroke-primary-tint"
            strokeWidth={10}
          />
          {members.map((m, i) => {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
            const x = C + R * Math.cos(angle);
            const y = C + R * Math.sin(angle);
            const kind = i === recipient ? "recipient" : (m.status ?? "pending");
            const r = kind === "recipient" ? bead + 3 : bead;
            const ringWidth = i === you ? 3 : 2;
            return (
              <g key={`${m.name}-${i}`} data-bead={kind} data-you={i === you ? "" : undefined}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  strokeWidth={ringWidth}
                  className={cn(BEAD[kind], i === you && "stroke-ink")}
                />
                <text x={x} y={y} dy="0.35em" textAnchor="middle" className="text-[10px] font-bold">
                  {initials(m.name)}
                </text>
                {m.photo && (
                  <>
                    <clipPath id={`${clipId}-${i}`}>
                      <circle cx={x} cy={y} r={r - ringWidth / 2} />
                    </clipPath>
                    <image
                      href={m.photo}
                      x={x - r}
                      y={y - r}
                      width={r * 2}
                      height={r * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${clipId}-${i})`}
                      aria-hidden
                    />
                    {/* The status ring is drawn over the photo; pending is dashed so colour is not the only cue. */}
                    <circle
                      data-ring=""
                      cx={x}
                      cy={y}
                      r={r}
                      fill="none"
                      strokeWidth={ringWidth + 0.5}
                      strokeDasharray={kind === "pending" ? "3 2.5" : undefined}
                      className={cn(RING[kind], i === you && "stroke-ink")}
                    />
                  </>
                )}
              </g>
            );
          })}
        </g>
        {center && (
          <g aria-hidden>
            <text
              x={C}
              y={C - 8}
              textAnchor="middle"
              className="fill-ink-muted text-[9px] font-semibold tracking-[0.04em]"
            >
              {center.label}
            </text>
            <text
              x={C}
              y={C + 16}
              textAnchor="middle"
              className="fill-ink font-display text-[21px] font-bold tabular-nums"
            >
              {center.value}
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}
