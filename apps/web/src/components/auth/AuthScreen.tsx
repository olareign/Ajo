import type { ReactNode } from "react";

/** A few beads from the circle, cropped by the corner of the screen: decoration, never information. */
function BeadCorner() {
  const beads = [
    { cx: 150, cy: 18, r: 9, className: "fill-adire-tint" },
    { cx: 120, cy: 40, r: 7, className: "fill-adire-tint" },
    { cx: 168, cy: 58, r: 11, className: "fill-oro" },
    { cx: 100, cy: 72, r: 5, className: "fill-adire-tint" },
    { cx: 140, cy: 92, r: 8, className: "fill-adire-tint" },
    { cx: 176, cy: 112, r: 6, className: "fill-adire-tint" },
  ];
  return (
    <svg
      data-corner=""
      aria-hidden="true"
      viewBox="0 0 200 140"
      className="pointer-events-none absolute -top-2 right-0 h-32 w-48 opacity-90"
    >
      {beads.map((b) => (
        <circle key={`${b.cx}-${b.cy}`} cx={b.cx} cy={b.cy} r={b.r} className={b.className} />
      ))}
    </svg>
  );
}

/** The frame every sign-in screen shares: full height, content on top, the footer line at the bottom. */
export function AuthScreen({
  children,
  footer,
}: Readonly<{ children: ReactNode; footer?: ReactNode }>) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <BeadCorner />
      <div className="relative flex flex-1 flex-col">{children}</div>
      {footer && (
        <div className="relative mt-6 text-center text-[15px] text-ink-muted">{footer}</div>
      )}
    </main>
  );
}
