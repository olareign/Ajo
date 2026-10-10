import { cn } from "@/lib/cn";

type Props = Readonly<{
  /** Width in CSS pixels; the height follows the logo's own proportions. */
  width?: number;
  /** Plays the entrance: the coin drops into the piggy bank and the sparkles twinkle. */
  animated?: boolean;
  className?: string;
}>;

// The logo is three transparent layers cut from the same artwork: sparkles and coin sit underneath
// the wordmark, so the coin can drop in behind the pig's back. Together they equal the original.
// The green wordmark has a lighter twin for dark mode (the gold reads on both); CSS shows the one
// that matches the page's theme, including a theme picked on Me.
const LAYERS = [
  { src: "/brand/ajo-rays.webp", motion: "logo-rays" },
  { src: "/brand/ajo-coin.webp", motion: "logo-coin" },
  { src: "/brand/ajo-wordmark.webp", theme: "theme-light-only" },
  { src: "/brand/ajo-wordmark-dark.webp", theme: "theme-dark-only" },
] as const satisfies readonly { src: string; motion?: string; theme?: string }[];

/** The Àjọ logo. One image to a screen reader; its layers are decoration. */
export function Logo({ width = 280, animated = false, className }: Props) {
  return (
    <span
      role="img"
      aria-label="Àjọ"
      data-animated={animated ? "" : undefined}
      className={cn("relative block max-w-full", animated && "logo-pop", className)}
      style={{ width, aspectRatio: "916 / 562" }}
    >
      {LAYERS.map((layer) => (
        // Plain <img>: small static files that must stack exactly, with nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={layer.src}
          src={layer.src}
          alt=""
          width={916}
          height={562}
          decoding="async"
          draggable={false}
          className={cn(
            "absolute inset-0 size-full select-none",
            "theme" in layer && layer.theme,
            animated && "motion" in layer && layer.motion,
          )}
        />
      ))}
    </span>
  );
}
