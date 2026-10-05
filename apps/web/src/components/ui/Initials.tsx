import { cn } from "@/lib/cn";

const TONES = [
  "bg-primary-tint text-primary",
  "bg-oro-tint text-oro-ink",
  "bg-tertiary-tint text-tertiary",
  "bg-leaf-tint text-leaf",
] as const;

/** A person's initials in a soft disc, the same colour every time for the same name. Decoration only. */
export function Initials({ name, size = 44 }: Readonly<{ name: string; size?: number }>) {
  const letters =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-display font-bold",
        TONES[hash % TONES.length],
      )}
    >
      {letters}
    </span>
  );
}
