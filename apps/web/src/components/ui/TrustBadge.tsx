import { Shield, ShieldCheck, Sprout } from "lucide-react";
import { cn } from "@/lib/cn";

export type TrustLevel = "new" | "building" | "trusted";

const LOOK: Record<TrustLevel, { word: string; tone: string; Icon: typeof Shield }> = {
  new: { word: "New", tone: "bg-surface-sunken text-ink-muted", Icon: Sprout },
  building: { word: "Building trust", tone: "bg-tertiary-tint text-tertiary", Icon: Shield },
  trusted: { word: "Trusted", tone: "bg-leaf-tint text-leaf", Icon: ShieldCheck },
};

/** How far someone's record has come: always a word and an icon as well as a colour. */
export function TrustBadge({
  level,
  className,
}: Readonly<{ level: TrustLevel; className?: string }>) {
  const { word, tone, Icon } = LOOK[level];
  return (
    <span
      data-level={level}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {word}
    </span>
  );
}
