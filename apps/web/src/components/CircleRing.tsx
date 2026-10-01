import { cn } from "@/lib/cn";

export type RingMember = Readonly<{ name: string; status?: "paid" | "pending" | "late" | "covered" }>;

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
}>;

const WORD = { paid: "paid", pending: "pending", late: "late", covered: "covered" } as const;

const BEAD = {
  paid: "fill-leaf stroke-leaf [&+text]:fill-surface-raised",
  pending: "fill-surface-raised stroke-line-strong [&+text]:fill-ink",
  late: "fill-danger stroke-danger [&+text]:fill-surface-raised",
  covered: "fill-adire stroke-adire [&+text]:fill-on-adire",
  recipient: "fill-oro stroke-oro [&+text]:fill-on-oro",
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** The circle: members as beads in spot order (spot 1 at the top, clockwise), recipient in gold. */
export function CircleRing({ members, recipient, you, center, title, size = 240, className }: Props) {
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
    <figure className={cn("m-0 aspect-square max-w-full", className)} style={{ width: size }}>
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`${title ? `${title}. ` : ""}${description}`}
        className="block h-auto w-full overflow-visible"
      >
        <circle cx={C} cy={C} r={R} fill="none" className="stroke-adire-tint" strokeWidth={10} />
        {members.map((m, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          const x = C + R * Math.cos(angle);
          const y = C + R * Math.sin(angle);
          const kind = i === recipient ? "recipient" : (m.status ?? "pending");
          return (
            <g key={`${m.name}-${i}`} data-bead={kind} data-you={i === you ? "" : undefined}>
              <circle
                cx={x}
                cy={y}
                r={kind === "recipient" ? bead + 3 : bead}
                strokeWidth={i === you ? 3 : 2}
                className={cn(BEAD[kind], i === you && "stroke-ink")}
              />
              <text x={x} y={y} dy="0.35em" textAnchor="middle" className="text-[10px] font-bold">
                {initials(m.name)}
              </text>
            </g>
          );
        })}
        {center && (
          <g aria-hidden>
            <text x={C} y={C - 8} textAnchor="middle" className="fill-ink-muted text-[9px] font-semibold tracking-[0.04em]">
              {center.label}
            </text>
            <text x={C} y={C + 16} textAnchor="middle" className="fill-ink font-display text-[21px] font-bold tabular-nums">
              {center.value}
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}
