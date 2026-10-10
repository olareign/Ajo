"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * High-end modern fintech background grid with intersection crosses and radial mask.
 * Adds tactile technical texture that shines in both light mode and the lightened dark mode.
 */
export function DotGridBackground({ className }: Readonly<{ className?: string }>) {
  const patternId = useId();
  const maskId = useId();

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={patternId} width="40" height="40" patternUnits="userSpaceOnUse">
            {/* Fine grid dot */}
            <circle cx="2" cy="2" r="1.2" className="fill-ink/15 dark:fill-ink/20" />

            {/* Subtle intersection cross markers every 80px */}
            <path
              d="M 20 18 L 20 22 M 18 20 L 22 20"
              stroke="currentColor"
              strokeWidth="0.8"
              className="text-primary/20 dark:text-primary/30"
            />
          </pattern>
          <radialGradient id={maskId} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={`mask-${maskId}`}>
            <rect width="100%" height="100%" fill={`url(#${maskId})`} />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          mask={`url(#mask-${maskId})`}
        />
      </svg>
    </div>
  );
}

/**
 * Concentric circular orbital waves and flowing financial rail waves
 * reflecting the rotational Èsúsú circle motif with live animated nodes.
 */
export function OrbitalRingsBackground({ className }: Readonly<{ className?: string }>) {
  const gradientId = useId();
  const railGradientId = useId();
  const secondaryRailId = useId();
  const pulseId = useId();

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden select-none opacity-60 dark:opacity-55",
        className,
      )}
    >
      <svg
        viewBox="0 0 1400 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full object-cover"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
            <stop offset="50%" stopColor="var(--oro)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--leaf)" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id={railGradientId} x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
            <stop offset="25%" stopColor="var(--primary)" stopOpacity="0.45" />
            <stop offset="50%" stopColor="var(--oro)" stopOpacity="0.5" />
            <stop offset="75%" stopColor="var(--primary-deep)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--leaf)" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={secondaryRailId} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--tertiary)" stopOpacity="0" />
            <stop offset="40%" stopColor="var(--tertiary)" stopOpacity="0.35" />
            <stop offset="70%" stopColor="var(--leaf)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>

          <radialGradient id={pulseId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.8" />
            <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dynamic Curved Financial Rails (Multi-border diaspora money streams) */}
        <path
          d="M -120 220 C 280 100, 520 500, 920 310 C 1220 180, 1360 460, 1520 380"
          stroke={`url(#${railGradientId})`}
          strokeWidth="2.5"
          strokeDasharray="8 8"
        />
        <path
          d="M -60 380 C 320 230, 620 620, 1080 390 C 1320 280, 1420 580, 1560 480"
          stroke={`url(#${secondaryRailId})`}
          strokeWidth="1.75"
        />
        <path
          d="M 100 -50 C 400 300, 750 150, 1100 550 C 1280 750, 1400 650, 1500 780"
          stroke={`url(#${railGradientId})`}
          strokeWidth="1.25"
          strokeDasharray="4 6"
          opacity="0.7"
        />

        {/* Rotating Circular Orbital Tracks with CSS animation */}
        <circle
          cx="700"
          cy="320"
          r="190"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 8"
          className="text-primary/30"
        />
        <circle
          cx="700"
          cy="320"
          r="310"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="14 18"
          className="text-oro/35 animate-[spin_90s_linear_infinite] origin-[700px_320px]"
        />
        <circle cx="700" cy="320" r="450" stroke={`url(#${gradientId})`} strokeWidth="1.75" />
        <circle
          cx="700"
          cy="320"
          r="610"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="10 12"
          className="text-primary/25 animate-[spin_120s_linear_infinite_reverse] origin-[700px_320px]"
        />
        <circle
          cx="700"
          cy="320"
          r="780"
          stroke="currentColor"
          strokeWidth="1"
          className="text-line-strong/20"
        />

        {/* Floating Geometric Fintech Elements: Naira (₦) and Pound (£) Token Badges */}
        <g className="animate-pulse">
          {/* Naira Token Badge floating at top left */}
          <g transform="translate(240, 160)">
            <circle
              cx="0"
              cy="0"
              r="24"
              className="fill-surface-raised stroke-primary/30"
              strokeWidth="1.5"
            />
            <circle
              cx="0"
              cy="0"
              r="30"
              className="stroke-primary/20 fill-none"
              strokeDasharray="3 3"
            />
            <text
              x="0"
              y="7"
              textAnchor="middle"
              className="fill-primary font-display font-black text-[18px] select-none"
            >
              ₦
            </text>
          </g>

          {/* British Pound Token Badge floating at top right */}
          <g transform="translate(1160, 210)">
            <circle
              cx="0"
              cy="0"
              r="22"
              className="fill-surface-raised stroke-oro/35"
              strokeWidth="1.5"
            />
            <circle
              cx="0"
              cy="0"
              r="28"
              className="stroke-oro/25 fill-none"
              strokeDasharray="3 3"
            />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              className="fill-oro-ink font-display font-black text-[16px] select-none"
            >
              £
            </text>
          </g>

          {/* Secure Circle Vault Node floating bottom left */}
          <g transform="translate(180, 520)">
            <circle
              cx="0"
              cy="0"
              r="18"
              className="fill-surface-raised stroke-leaf/35"
              strokeWidth="1.5"
            />
            <circle cx="0" cy="0" r="6" className="fill-leaf" />
          </g>
        </g>

        {/* Cardinal Direction & Geometric Radial Ticks */}
        <line
          x1="700"
          y1="30"
          x2="700"
          y2="60"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-primary/50"
        />
        <line
          x1="700"
          y1="580"
          x2="700"
          y2="610"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-primary/50"
        />
        <line
          x1="410"
          y1="320"
          x2="440"
          y2="320"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-oro/50"
        />
        <line
          x1="960"
          y1="320"
          x2="990"
          y2="320"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-oro/50"
        />

        {/* Crosshair Intersections */}
        <path
          d="M 690 320 L 710 320 M 700 310 L 700 330"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary/40"
        />

        {/* Orbiting Satellite Beads (Live Pulsing Markers with Wave Radii) */}
        <g>
          <circle cx="1010" cy="320" r="6" className="fill-primary" />
          <circle cx="1010" cy="320" r="14" className="stroke-primary/45 fill-none animate-ping" />
        </g>
        <g>
          <circle cx="390" cy="320" r="5" className="fill-oro" />
          <circle cx="390" cy="320" r="11" className="stroke-oro/40 fill-none animate-ping" />
        </g>
        <circle cx="700" cy="770" r="5" className="fill-leaf" />
        <circle cx="700" cy="-130" r="4" className="fill-primary" />
      </svg>
    </div>
  );
}

/**
 * Atmospheric glowing gradient orbs with multi-stop color fields.
 */
export function AmbientGlows() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-primary/15 blur-[160px] dark:bg-primary/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 -right-40 size-[550px] rounded-full bg-oro/15 blur-[160px] dark:bg-oro/18"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-2/3 -left-40 size-[500px] rounded-full bg-leaf/12 blur-[150px] dark:bg-leaf/18"
      />
    </>
  );
}
