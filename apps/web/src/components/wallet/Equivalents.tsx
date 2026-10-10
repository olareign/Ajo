import { Info } from "lucide-react";
import type { FxEquivalents } from "@/lib/fx";
import { formatMoney } from "@/lib/money-format";
import { whenText } from "@/lib/when";

/**
 * A balance's value in other currencies, at the latest rate. It says plainly that it is an estimate
 * and that nothing has been converted, and when the rates were true. Hidden with the balance.
 */
export function Equivalents({
  fx,
  currency,
  hidden,
  tone = "hero",
}: Readonly<{
  fx: FxEquivalents | null | undefined;
  currency: string;
  hidden: boolean;
  tone?: "hero" | "plain";
}>) {
  const wallet = fx?.wallets.find((w) => w.currency === currency);
  if (!fx || !wallet || wallet.equivalents.length === 0) return null;
  const muted = tone === "hero" ? "text-on-hero-muted" : "text-ink-muted";
  return (
    <div className={`grid gap-1 text-[13px] leading-5 ${muted}`}>
      <p aria-label="Worth about">
        {hidden ? (
          <span aria-hidden>≈ ••••</span>
        ) : (
          wallet.equivalents.map((e, i) => (
            <span key={e.currency} className="tabular-nums">
              {i === 0 ? "≈ " : " · "}
              {formatMoney({ amount: e.amount, currency: e.currency }, "en-GB")}
            </span>
          ))
        )}
      </p>
      <p className="flex items-center gap-1 text-[11px]">
        <Info aria-hidden className="size-3 shrink-0" />
        {fx.sample
          ? "Sample rates for testing, not real ones."
          : `Estimate only; nothing is converted. Rates ${fx.stale ? "last updated" : "as of"} ${whenText(fx.asOf ?? "")}.`}
      </p>
    </div>
  );
}
