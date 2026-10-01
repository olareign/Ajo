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
const LAYERS = [
  { src: "/brand/ajo-rays.webp", name: "logo-rays" },
  { src: "/brand/ajo-coin.webp", name: "logo-coin" },
  { src: "/brand/ajo-wordmark.webp", name: "logo-wordmark" },
] as const;

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
        // Plain <img>: three small static files that must stack exactly, with nothing to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={layer.src}
          src={layer.src}
          alt=""
          width={916}
          height={562}
          decoding="async"
          draggable={false}
          className={cn("absolute inset-0 size-full select-none", animated && layer.name)}
        />
      ))}
    </span>
  );
}
