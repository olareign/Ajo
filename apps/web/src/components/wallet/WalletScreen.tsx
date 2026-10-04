"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { Wallet, WalletTransaction } from "@/lib/wallet";
import { loadTransactions, loadWallets } from "@/lib/wallet-client";
import { BalanceCard } from "./BalanceCard";
import { TransactionList } from "./TransactionList";

type State =
  | Readonly<{ phase: "loading" }>
  | Readonly<{ phase: "failed" }>
  | Readonly<{
      phase: "ready";
      wallets: Wallet[];
      items: WalletTransaction[];
      next: string | null;
      moreFailed: boolean;
    }>;

export function WalletScreen() {
  return <MeGate needs="onboarded">{() => <Wallets />}</MeGate>;
}

function Wallets() {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      // One call at a time: the session's refresh token is single-use, so two calls racing on an
      // expired access token would each try to swap it, and the second would end the session.
      const balances = await loadWallets();
      if (!live) return;
      if (balances.status === "signed-out") return router.replace("/sign-in");
      if (balances.status === "failed") return setState({ phase: "failed" });
      const history = await loadTransactions();
      if (!live) return;
      if (history.status === "signed-out") return router.replace("/sign-in");
      if (history.status === "failed") return setState({ phase: "failed" });
      setState({
        phase: "ready",
        wallets: balances.data,
        items: history.data.items,
        next: history.data.next,
        moreFailed: false,
      });
    })();
    return () => {
      live = false;
    };
  }, [router, attempt]);

  function retry() {
    setState({ phase: "loading" });
    setAttempt((n) => n + 1);
  }

  async function showMore(current: Extract<State, { phase: "ready" }>) {
    if (!current.next) return;
    setLoadingMore(true);
    const page = await loadTransactions(current.next);
    if (!mounted.current) return;
    setLoadingMore(false);
    if (page.status === "signed-out") return router.replace("/sign-in");
    setState(
      page.status === "ok"
        ? {
            ...current,
            items: [...current.items, ...page.data.items],
            next: page.data.next,
            moreFailed: false,
          }
        : { ...current, moreFailed: true },
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-10 pb-28">
      <ScreenHeader title="Wallet" subtitle="Your money, and where it sits." backHref="/today" />
      <nav aria-label="Money actions" className="mb-8 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <ButtonLink href="/wallet/add" size="lg">
            Add money
          </ButtonLink>
          <ButtonLink href="/wallet/withdraw" size="lg" variant="quiet">
            Withdraw
          </ButtonLink>
        </div>
        {[
          ["/wallet/mandate", "Auto-debit"],
          ["/wallet/limits", "Your limits"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href!}
            className="flex items-center justify-between rounded-[var(--radius-l)] bg-surface-raised px-4 py-3.5 text-[15px] font-semibold shadow-lift"
          >
            {label}
            <ChevronRight aria-hidden className="size-5 text-ink-muted" />
          </Link>
        ))}
      </nav>
      {state.phase === "loading" && (
        <p className="sr-only" role="status">
          Loading…
        </p>
      )}
      {state.phase === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-danger">
            We couldn&apos;t load your wallet.
          </p>
          <Button variant="quiet" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
      {state.phase === "ready" && (
        <div className="grid gap-8">
          {state.wallets.length === 0 ? (
            <p className="text-ink-muted">
              No money here yet. When you add or receive money, it shows up here.
            </p>
          ) : (
            <div className="grid gap-4">
              {state.wallets.map((wallet) => (
                <BalanceCard key={wallet.currency} wallet={wallet} />
              ))}
            </div>
          )}
          <section aria-labelledby="activity" className="grid gap-2">
            <h2 id="activity" className="font-display text-[22px] leading-7 font-semibold">
              Recent activity
            </h2>
            <TransactionList items={state.items} />
            {state.moreFailed && (
              <p role="alert" className="text-danger">
                We couldn&apos;t load more.
              </p>
            )}
            {state.next && (
              <Button variant="quiet" disabled={loadingMore} onClick={() => void showMore(state)}>
                Show more
              </Button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
