import { cn } from "@/lib/cn";
import { formatMoney, type MoneyDto } from "@/lib/money-format";

type Props = MoneyDto &
  Readonly<{
    locale?: string;
    size?: "xl" | "m" | "s";
    tone?: "oro" | "muted";
    className?: string;
  }>;

const sizes = {
  xl: "text-[48px] leading-[52px] font-bold tracking-[-0.02em]",
  m: "text-[22px] leading-7 font-semibold",
  s: "text-[15px] leading-[22px] font-semibold",
};

/** Money from the API's integer minor units; malformed data shows a dash, never a wrong number. */
export function Amount({ amount, currency, locale = "en-NG", size = "m", tone, className }: Props) {
  let text: string;
  try {
    text = formatMoney({ amount, currency }, locale);
  } catch {
    text = "—";
  }
  return (
    <span
      data-size={size}
      data-tone={tone}
      className={cn(
        "font-display whitespace-nowrap tabular-nums",
        sizes[size],
        tone === "oro" ? "text-oro-ink" : tone === "muted" ? "text-ink-muted" : "text-ink",
        className,
      )}
    >
      {text}
    </span>
  );
}
