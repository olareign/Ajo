"use client";

import { Amount } from "@/components/ui/Amount";
import { useHiddenBalance } from "@/lib/hidden-balance";
import { currencyName, type Wallet } from "@/lib/wallet";
import { BalanceEye, HiddenAmount, SIGN } from "./BalanceEye";

/** One currency's money: what can be spent, then what is held back and what is saved. */
export function BalanceCard({ wallet }: Readonly<{ wallet: Wallet }>) {
  const name = currencyName(wallet.currency);
  const [hidden, toggle] = useHiddenBalance();
  const sign = SIGN[wallet.currency] ?? wallet.currency;
  const money = (value: Wallet["available"], size: "l" | "s") =>
    hidden ? (
      <HiddenAmount
        sign={sign}
        className={
          size === "l"
            ? "font-display text-[34px] leading-10 font-bold"
            : "font-display text-[15px] font-semibold"
        }
      />
    ) : (
      <Amount {...value} size={size} tone="hero" />
    );
  return (
    <section
      aria-label={`${name} wallet`}
      className="hero-card grid gap-5 overflow-hidden rounded-[var(--radius-xl)] p-5 shadow-lift"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold tracking-[0.04em] text-on-hero-muted uppercase">
          {name}
        </p>
        <BalanceEye hidden={hidden} onToggle={toggle} />
      </div>
      <div className="grid gap-1">
        <p className="text-[13px] text-on-hero-muted">Available</p>
        {money(wallet.available, "l")}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="grid gap-1 rounded-m bg-[var(--hero-chip)] p-3">
          <dt className="text-[12px] text-on-hero-muted">Locked</dt>
          <dd>{money(wallet.locked, "s")}</dd>
        </div>
        <div className="grid gap-1 rounded-m bg-[var(--hero-chip)] p-3">
          <dt className="text-[12px] text-on-hero-muted">Savings</dt>
          <dd>{money(wallet.savings, "s")}</dd>
        </div>
      </dl>
    </section>
  );
}
