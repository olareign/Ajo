import { useId } from "react";
import { cn } from "@/lib/cn";

type Props = Readonly<{ size?: number; className?: string }>;

/** A person's bead: the same head-and-shoulders as in the circle, ringed in the brand green. Decoration only. */
export function Avatar({ size = 48, className }: Props) {
  const clip = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <clipPath id={clip}>
        <circle cx="32" cy="32" r="29" />
      </clipPath>
      <circle
        cx="32"
        cy="32"
        r="30"
        className="fill-surface-raised stroke-primary"
        strokeWidth="3"
      />
      <g clipPath={`url(#${clip})`} className="fill-primary-deep">
        <circle cx="32" cy="26" r="10" />
        <ellipse cx="32" cy="58" rx="22" ry="17" />
      </g>
    </svg>
  );
}
