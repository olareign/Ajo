"use client";

import { ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Amount } from "@/components/ui/Amount";
import { useHiddenBalance } from "@/lib/hidden-balance";
import type { Wallet } from "@/lib/wallet";
import { loadWallets } from "@/lib/wallet-client";
import { BalanceEye, HiddenAmount, SIGN } from "./BalanceEye";

/**
 * Today's hero: what is available, one line per currency, with an eye to hide it and the two money
 * actions people reach for most. The balance itself leads to the wallet.
 */
export function WalletSummary({
  onLoaded,
  currency,
}: Readonly<{
  onLoaded?: () => void;
  /** The person's own currency: an empty wallet then reads as zero in it, as money apps do. */
  currency?: string;
}> = {}) {
  const router = useRouter();
  const [hidden, toggle] = useHiddenBalance();
  // undefined while loading, null when it could not be loaded.
  const [wallets, setWallets] = useState<Wallet[] | null>();

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await loadWallets();
      if (!live) return;
      if (result.status === "signed-out") return router.replace("/sign-in");
      setWallets(result.status === "ok" ? result.data : null);
      onLoaded?.();
    })();
    return () => {
      live = false;
    };
  }, [router, onLoaded]);

  return (
    <section
      aria-label="Your balance"
      className="hero-card relative mt-6 grid gap-5 overflow-hidden rounded-[var(--radius-xl)] p-5 shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <Link href="/wallet" className="grid min-w-0 gap-1.5 rounded-m">
          <span className="flex items-center gap-1 text-[13px] font-medium text-on-hero-muted">
            Wallet balance
            <ChevronRight aria-hidden className="size-4" />
          </span>
          {wallets === undefined && (
            <span className="h-10 w-44 animate-pulse rounded-m bg-[var(--hero-chip)]">
              <span className="sr-only">Loading…</span>
            </span>
          )}
          {wallets === null && <span className="text-on-hero-muted">Tap to see your balance</span>}
          {wallets?.length === 0 &&
            (currency ? (
              <span className="grid gap-0.5">
                {hidden ? (
                  <HiddenAmount
                    sign={SIGN[currency] ?? currency}
                    className="font-display text-[34px] leading-10 font-bold tracking-[-0.02em]"
                  />
                ) : (
                  <Amount amount="0" currency={currency} size="l" tone="hero" />
                )}
                <span className="text-[12px] text-on-hero-muted">Available</span>
              </span>
            ) : (
              <span className="text-on-hero-muted">Nothing here yet</span>
            ))}
          {wallets?.map((wallet) => (
            <span key={wallet.currency} className="grid gap-0.5">
              {hidden ? (
                <HiddenAmount
                  sign={SIGN[wallet.currency] ?? wallet.currency}
                  className="font-display text-[34px] leading-10 font-bold tracking-[-0.02em]"
                />
              ) : (
                <Amount {...wallet.available} size="l" tone="hero" />
              )}
              <span className="text-[12px] text-on-hero-muted">Available</span>
            </span>
          ))}
        </Link>
        <BalanceEye hidden={hidden} onToggle={toggle} />
      </div>
      <nav aria-label="Move money" className="grid grid-cols-2 gap-3">
        <Link
          href="/wallet/add"
          className="flex min-h-12 items-center justify-center gap-2 rounded-m bg-oro px-4 text-[15px] font-semibold text-on-oro transition-[filter] hover:brightness-95"
        >
          <ArrowDownToLine aria-hidden className="size-5" />
          Add money
        </Link>
        <Link
          href="/wallet/withdraw"
          className="flex min-h-12 items-center justify-center gap-2 rounded-m bg-[var(--hero-chip)] px-4 text-[15px] font-semibold text-on-hero transition-colors hover:bg-white/20"
        >
          <ArrowUpFromLine aria-hidden className="size-5" />
          Withdraw
        </Link>
      </nav>
    </section>
  );
}
