"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MeGate } from "@/components/onboarding/MeGate";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Building2,
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
import { usePaged } from "@/lib/paging";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Pager } from "@/components/ui/Pager";
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

  async function showMore() {
    if (state.phase !== "ready" || !state.next) return;
    setLoadingMore(true);
    const page = await loadTransactions(state.next);
    if (!mounted.current) return;
    setLoadingMore(false);
    if (page.status === "signed-out") return router.replace("/sign-in");
    setState((s) =>
      s.phase !== "ready"
        ? s
        : page.status === "ok"
          ? {
              ...s,
              items: [...s.items, ...page.data.items],
              next: page.data.next,
              moreFailed: false,
            }
          : { ...s, moreFailed: true },
    );
  }

  return (
    <main className={PAGE}>
      <ScreenHeader
        tab
        title="Wallet"
        subtitle="Your money, and where it sits."
        pageAction={
          <div className="grid grid-cols-2 gap-3">
            <ButtonLink href="/wallet/withdraw" size="lg" variant="quiet" block>
              <ArrowUpFromLine aria-hidden className="size-5" />
              Withdraw
            </ButtonLink>
            <ButtonLink href="/wallet/add" size="lg" block>
              <ArrowDownToLine aria-hidden className="size-5" />
              Add money
            </ButtonLink>
          </div>
        }
      />
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
          <WalletTools />
        </div>
      )}
      {state.phase === "ready" && (
        <div className="grid gap-6">
          {state.wallets.length === 0 ? (
            <p className="rounded-[var(--radius-l)] bg-surface-sunken p-5 text-ink-muted">
              No money here yet. When you add or receive money, it shows up here.
            </p>
          ) : (
            state.wallets.map((wallet) => (
              <BalanceCard key={wallet.currency} wallet={wallet} fx={state.fx} />
            ))
          )}
          <WalletTools />
          <Activity
            items={state.items}
            hasMore={Boolean(state.next) && !loadingMore}
            moreFailed={state.moreFailed}
            more={showMore}
          />
        </div>
      )}
    </main>
  );
}

/** Recent activity, grouped by day, a page at a time; older pages are fetched as Next is pressed. */
function Activity({
  items,
  hasMore,
  moreFailed,
  more,
}: Readonly<{
  items: readonly WalletTransaction[];
  hasMore: boolean;
  moreFailed: boolean;
  more: () => Promise<void>;
}>) {
  const paged = usePaged(items);
  return (
    <section
      aria-labelledby="activity"
      className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-raised shadow-lift"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-1 md:px-6">
        <h2 id="activity" className="font-display text-[20px] leading-7 font-bold">
          Recent activity
        </h2>
        <Link
          href="/wallet/statements"
          className="flex items-center gap-1 text-[14px] font-semibold text-primary hover:underline"
        >
          See all in Statements
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      <div className="px-2 md:px-4">
        <TransactionList items={paged.slice} grouped />
      </div>
      {moreFailed && (
        <p role="alert" className="border-t border-line p-4 text-danger">
          We couldn&apos;t load more.
        </p>
      )}
      <Pager
        paged={paged}
        noun={["payment", "payments"]}
        more={{ has: hasMore, load: more }}
        className="border-t border-line"
      />
    </section>
  );
}

/** The wallet's other tools, as cards: auto-debit, limits, bank accounts, statements, insights. */
function WalletTools() {
  return (
    <nav aria-label="Wallet tools" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {(
        [
          ["/wallet/mandate", "Auto-debit", "Lets your bank top up a short wallet", Landmark],
          ["/wallet/limits", "Your limits", "How much can move each day", Gauge],
          ["/wallet/bank", "Bank accounts", "Where withdrawals go", Building2],
          ["/wallet/statements", "Statements", "Every payment, and a copy to download", FileText],
          ["/insights", "Insights", "Money in, out and saved, month by month", BarChart3],
        ] as const
      ).map(([href, label, hint, Icon]) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-3 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift transition-colors hover:bg-surface-sunken xl:grid xl:content-start xl:gap-3 xl:p-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
            <Icon aria-hidden className="size-5" />
          </span>
          <span className="grid min-w-0">
            <span className="text-[15px] font-semibold">{label}</span>
            <span className="text-[13px] leading-5 text-ink-muted">{hint}</span>
          </span>
          <ChevronRight aria-hidden className="ml-auto size-5 shrink-0 text-ink-muted xl:hidden" />
        </Link>
      ))}
    </nav>
  );
}
