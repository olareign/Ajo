import { cn } from "@/lib/cn";

const TONES = {
  good: "bg-leaf-tint text-leaf",
  warn: "bg-oro-tint text-oro-ink",
  bad: "bg-danger-tint text-danger",
  info: "bg-primary-tint text-primary",
  quiet: "bg-surface-sunken text-ink-muted",
} as const;
export type Tone = keyof typeof TONES;

/** A small status chip: always a word, never colour alone. */
export function Badge({ tone = "quiet", children }: Readonly<{ tone?: Tone; children: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** The tone each kind of status reads in. */
export const statusTone = (status: string): Tone =>
  (
    ({
      active: "good",
      approved: "good",
      resolved: "good",
      ok: "good",
      suspended: "bad",
      rejected: "bad",
      denied: "bad",
      disabled: "bad",
      failed: "bad",
      pending: "warn",
      invited: "warn",
      open: "warn",
      closed: "quiet",
      written_off: "quiet",
      not_started: "quiet",
    }) as Record<string, Tone>
  )[status] ?? "quiet";
