"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, Gauge, Landmark } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Wallet, WalletTransaction } from "@/lib/wallet";
import { loadScreen, partData } from "@/lib/screen-client";
import { recall, remember } from "@/lib/visit-cache";
import { loadTransactions, type TransactionPage } from "@/lib/wallet-client";
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
  // Within a visit the last copy shows at once while a fresh one loads.
  const [state, setState] = useState<State>(
    () => recall<State>("screen:wallet") ?? { phase: "loading" },
  );
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
      // Balances and the first page of activity come in one request.
      const result = await loadScreen("wallet");
      if (!live) return;
      if (result.status === "signed-out") return router.replace("/sign-in");
      const balances = result.status === "ok" ? partData(result.data.wallets) : null;
      const history = result.status === "ok" ? partData(result.data.transactions) : null;
      const page = history as TransactionPage | null;
      if (!Array.isArray(balances?.wallets) || !Array.isArray(page?.items)) {
        return setState((was) => (was.phase === "ready" ? was : { phase: "failed" }));
      }
      const next: State = {
        phase: "ready",
        wallets: balances.wallets as Wallet[],
        items: page.items,
        next: typeof page.next === "string" ? page.next : null,
        moreFailed: false,
      };
      remember("screen:wallet", next);
      setState(next);
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
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
      <ScreenHeader title="Wallet" subtitle="Your money, and where it sits." backHref="/today" />
      {state.phase === "loading" && (
        <div role="status" className="grid gap-4">
          <span className="sr-only">Loading…</span>
          <div
            aria-hidden
            className="h-48 animate-pulse rounded-[var(--radius-xl)] bg-surface-sunken"
          />
          <div
            aria-hidden
            className="h-40 animate-pulse rounded-[var(--radius-l)] bg-surface-sunken"
          />
        </div>
      )}
      {state.phase === "failed" && (
        <div className="grid gap-4">
          <p role="alert" className="text-danger">
            We couldn&apos;t load your wallet.
          </p>
          <Button variant="quiet" onClick={retry}>
            Try again
          </Button>
          <MoneyActions />
        </div>
      )}
      {state.phase === "ready" && (
        <div className="grid gap-6">
          {state.wallets.length === 0 ? (
            <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-ink-muted">
              No money here yet. When you add or receive money, it shows up here.
            </p>
          ) : (
            <div className="grid gap-4">
              {state.wallets.map((wallet) => (
                <BalanceCard key={wallet.currency} wallet={wallet} />
              ))}
            </div>
          )}
          <MoneyActions />
          <section aria-labelledby="activity" className="grid gap-2">
            <h2 id="activity" className="font-display text-[18px] leading-6 font-semibold">
              Recent activity
            </h2>
            <div className="rounded-[var(--radius-l)] bg-surface-raised px-4 shadow-lift">
              <TransactionList items={state.items} />
            </div>
            {state.moreFailed && (
              <p role="alert" className="text-danger">
                We couldn&apos;t load more.
              </p>
            )}
            {state.next && (
              <Button
                variant="quiet"
                loading={loadingMore}
                disabled={loadingMore}
                onClick={() => void showMore(state)}
              >
                Show more
              </Button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

/** Add money and withdraw as the two big actions under the balance, then auto-debit and limits as rows. */
function MoneyActions() {
  return (
    <nav aria-label="Money actions" className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/wallet/add"
          className="flex min-h-14 items-center justify-center gap-2 rounded-[var(--radius-l)] bg-oro px-4 text-base font-semibold text-on-oro shadow-lift transition-[filter] hover:brightness-95"
        >
          <ArrowDownToLine aria-hidden className="size-5" />
          Add money
        </Link>
        <Link
          href="/wallet/withdraw"
          className="flex min-h-14 items-center justify-center gap-2 rounded-[var(--radius-l)] bg-surface-raised px-4 text-base font-semibold text-primary shadow-lift"
        >
          <ArrowUpFromLine aria-hidden className="size-5" />
          Withdraw
        </Link>
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
        {(
          [
            ["/wallet/mandate", "Auto-debit", "Lets your bank top up a short wallet", Landmark],
            ["/wallet/limits", "Your limits", "How much can move each day", Gauge],
          ] as const
        ).map(([href, label, hint, Icon]) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-sunken"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="grid min-w-0">
              <span className="text-[15px] font-semibold">{label}</span>
              <span className="text-[13px] text-ink-muted">{hint}</span>
            </span>
            <ChevronRight aria-hidden className="ml-auto size-5 shrink-0 text-ink-muted" />
          </Link>
        ))}
      </div>
    </nav>
  );
}
