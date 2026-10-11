"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  ChevronRight,
  FileText,
  Gauge,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Wallet, WalletTransaction } from "@/lib/wallet";
import { readFx, type FxEquivalents } from "@/lib/fx";
import { loadScreen, partData } from "@/lib/screen-client";
import { recall, remember } from "@/lib/visit-cache";
import { loadTransactions, type TransactionPage } from "@/lib/wallet-client";
import { useWide } from "@/lib/use-wide";
import { MonthPanel } from "@/components/desk/MonthPanel";
import { PaymentDetails } from "@/components/desk/PaymentDetails";
import { BalanceCard } from "./BalanceCard";
import { TransactionList } from "./TransactionList";
import { PAGE } from "@/lib/page";

type State =
  | Readonly<{ phase: "loading" }>
  | Readonly<{ phase: "failed" }>
  | Readonly<{
      phase: "ready";
      wallets: Wallet[];
      fx: FxEquivalents | null;
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
  // On a desk a payment can be picked from the list and read in the panel beside it.
  const wide = useWide();
  const [picked, setPicked] = useState<WalletTransaction>();
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
        fx: result.status === "ok" ? readFx(partData(result.data.fx)) : null,
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
    <main className={PAGE}>
      <ScreenHeader tab title="Wallet" subtitle="Your money, and where it sits." />
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
        // On a desk, like a bank's dashboard, three columns fill the width: balance and actions;
        // the activity; this month's summary and the details of the payment picked from the list.
        // The outer two stay in view while the activity scrolls. On a narrower desk the activity
        // goes under the balance. A phone reads balance, actions and activity, as before.
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="grid gap-6 xl:sticky xl:top-28">
            {state.wallets.length === 0 ? (
              <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-ink-muted">
                No money here yet. When you add or receive money, it shows up here.
              </p>
            ) : (
              <div className="grid gap-4">
                {state.wallets.map((wallet) => (
                  <BalanceCard key={wallet.currency} wallet={wallet} fx={state.fx} />
                ))}
              </div>
            )}
            <MoneyActions />
          </div>
          <section
            aria-labelledby="activity"
            className="grid gap-2 lg:col-start-1 xl:col-start-2 xl:row-start-1"
          >
            <h2 id="activity" className="font-display text-[18px] leading-6 font-semibold">
              Recent activity
            </h2>
            <div className="rounded-[var(--radius-l)] bg-surface-raised px-4 shadow-lift">
              <TransactionList
                items={state.items}
                onSelect={wide ? setPicked : undefined}
                selectedId={picked?.id}
              />
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
          {wide && (
            <div className="grid gap-6 lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:col-start-3 xl:row-span-1">
              <MonthPanel currency={state.wallets[0]?.currency} />
              <PaymentDetails item={picked} />
            </div>
          )}
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
            ["/wallet/statements", "Statements", "Every payment, and a copy to download", FileText],
            ["/insights", "Insights", "Money in, out and saved, month by month", BarChart3],
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
