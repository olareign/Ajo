import { cn } from "@/lib/cn";

type Props = Readonly<{ total: number; done: number; label: string; caption?: string }>;

/** Progress through a known number of steps or rounds, drawn like stitches. */
export function Stitches({ total, done, label, caption }: Props) {
  const complete = Math.max(0, Math.min(done, total));
  return (
    <div className="grid gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={complete}
        aria-valuetext={`Step ${Math.min(complete + 1, total)} of ${total}`}
        className="flex gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            data-stitch={i < complete ? "done" : i === complete ? "now" : "todo"}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < complete && "bg-primary",
              i === complete &&
                "bg-[repeating-linear-gradient(90deg,var(--primary)_0_6px,transparent_6px_10px)] shadow-[inset_0_0_0_1px_var(--primary)]",
              i > complete && "bg-surface-sunken shadow-[inset_0_0_0_1px_var(--line)]",
            )}
          />
        ))}
      </div>
      {caption && <p className="text-xs font-medium text-ink-muted">{caption}</p>}
    </div>
  );
}
