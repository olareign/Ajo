import { encode } from "uqr";

type Props = Readonly<{ value: string; label: string; className?: string }>;

const QUIET_ZONE = 2;

/**
 * A QR code drawn in the browser, so the setup secret inside it never goes to anyone else. It is
 * always dark on white, even in a dark theme: scanners expect that contrast.
 */
export function QrCode({ value, label, className }: Props) {
  const { data: rows } = encode(value, { ecc: "M", border: 0 });
  const size = rows.length + QUIET_ZONE * 2;
  const modules: string[] = [];
  rows.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) modules.push(`M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`);
    }),
  );
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={modules.join("")} fill="#0f1f17" />
    </svg>
  );
}
