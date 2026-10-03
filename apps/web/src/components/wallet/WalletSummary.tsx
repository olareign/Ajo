"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Amount } from "@/components/ui/Amount";
import type { Wallet } from "@/lib/wallet";
import { loadWallets } from "@/lib/wallet-client";

/** Today's glance at the wallet: what is available, one line per currency, leading to the full screen. */
export function WalletSummary() {
  const router = useRouter();
  // undefined while loading, null when it could not be loaded.
  const [wallets, setWallets] = useState<Wallet[] | null>();

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await loadWallets();
      if (!live) return;
      if (result.status === "signed-out") return router.replace("/sign-in");
      setWallets(result.status === "ok" ? result.data : null);
    })();
    return () => {
      live = false;
    };
  }, [router]);

  return (
    <Link
      href="/wallet"
      className="mt-8 flex items-center justify-between gap-4 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift"
    >
      <span className="grid gap-2">
        <span className="text-[13px] font-semibold tracking-[0.01em] text-tertiary">Wallet</span>
        {wallets === undefined && <span className="sr-only">Loading…</span>}
        {wallets === null && <span className="text-ink-muted">Tap to see your balance</span>}
        {wallets?.length === 0 && <span className="text-ink-muted">Nothing here yet</span>}
        {wallets?.map((wallet) => (
          <span key={wallet.currency} className="grid gap-0.5">
            <Amount {...wallet.available} size="m" />
            <span className="text-[13px] text-ink-muted">Available</span>
          </span>
        ))}
      </span>
      <ChevronRight aria-hidden className="size-6 shrink-0 text-ink-muted" />
    </Link>
  );
}
