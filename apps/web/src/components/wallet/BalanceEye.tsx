import { Eye, EyeOff } from "lucide-react";

/** Shows or hides balances. Lives on the dark hero, so it uses the hero's own colours. */
export function BalanceEye({
  hidden,
  onToggle,
}: Readonly<{ hidden: boolean; onToggle: () => void }>) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Show balance" : "Hide balance"}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--hero-chip)] text-on-hero transition-colors hover:bg-white/20"
    >
      {hidden ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
    </button>
  );
}

/** What a hidden balance looks like: the currency sign and dots, read out as "hidden". */
export function HiddenAmount({ sign, className }: Readonly<{ sign: string; className?: string }>) {
  return (
    <span className={className}>
      <span aria-hidden>{sign} ••••••</span>
      <span className="sr-only">Balance hidden</span>
    </span>
  );
}

export const SIGN: Readonly<Record<string, string>> = { NGN: "₦", GBP: "£" };
