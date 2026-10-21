"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Gauge,
  Landmark,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Amount } from "@/components/ui/Amount";
import { cn } from "@/lib/cn";
import { useHiddenBalance } from "@/lib/hidden-balance";
import { loadWallets } from "@/lib/wallet-client";
import { recall, remember } from "@/lib/visit-cache";
import type { Wallet } from "@/lib/wallet";
import { BalanceEye, HiddenAmount, SIGN } from "./BalanceEye";

export const WALLET_MENU: readonly Readonly<{
  href: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
}>[] = [
  {
    href: "/wallet/add",
    label: "Add money",
    hint: "From your bank or card",
    Icon: ArrowDownToLine,
  },
  {
    href: "/wallet/withdraw",
    label: "Withdraw",
    hint: "To your bank account",
    Icon: ArrowUpFromLine,
  },
  {
    href: "/wallet/mandate",
    label: "Auto-debit",
    hint: "Your bank tops up a short wallet",
    Icon: RefreshCw,
  },
  { href: "/wallet/limits", label: "Your limits", hint: "How much can move each day", Icon: Gauge },
  { href: "/wallet/bank", label: "Bank accounts", hint: "Where withdrawals go", Icon: Landmark },
  {
    href: "/wallet/statements",
    label: "Statements",
    hint: "Every payment, and a copy to keep",
    Icon: FileText,
  },
];

/** The wallet pages that sit under the sub-menu; the wallet itself is the hub and has none. */
const isTaskPage = (path: string) =>
  WALLET_MENU.some((m) => path === m.href || path.startsWith(`${m.href}/`));

/**
 * From a tablet up, every wallet task page (add money, withdraw, auto-debit, limits, bank accounts,
 * statements) keeps a small menu beside it: the balance, then the other wallet tools, so moving
 * between them never means going back first. A phone keeps one page at a time, as before.
 */
export function WalletShell({ children }: Readonly<{ children: ReactNode }>) {
  const path = usePathname();
  if (!isTaskPage(path)) return <>{children}</>;
  return (
    <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      <Menu path={path} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * A tablet gets the tools as a row of chips above the page (the page keeps its width); a desk gets
 * them as a column with the balance on top.
 */
function Menu({ path }: Readonly<{ path: string }>) {
  const preview = useSearchParams().get("preview") === "1";
  const go = (href: string) => (preview ? `${href}?preview=1` : href);
  return (
    <aside
      aria-label="Wallet"
      className="hidden min-w-0 md:grid md:px-6 md:pt-6 lg:sticky lg:top-28 lg:gap-4 lg:pt-8 lg:pr-0 lg:pl-8"
    >
      {!preview && (
        <div className="hidden lg:block">
          <MiniBalance />
        </div>
      )}
      <nav
        aria-label="Wallet menu"
        className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-0.5 lg:overflow-visible lg:rounded-[20px] lg:bg-surface-raised lg:p-2 lg:shadow-lift"
      >
        {WALLET_MENU.map(({ href, label, hint, Icon }) => {
          const on = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={go(href)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 whitespace-nowrap transition-colors lg:gap-3 lg:rounded-[14px] lg:border-0 lg:px-3 lg:py-2.5",
                on
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-line bg-surface-raised text-ink hover:bg-surface-sunken lg:bg-transparent",
              )}
            >
              <span
                className={cn(
                  "hidden size-9 shrink-0 place-items-center rounded-full lg:grid",
                  on ? "bg-primary text-on-primary" : "bg-primary-tint text-primary",
                )}
              >
                <Icon aria-hidden className="size-[18px]" />
              </span>
              <span className="grid min-w-0">
                <span
                  className={cn("text-[14px] lg:text-[15px]", on ? "font-semibold" : "font-medium")}
                >
                  {label}
                </span>
                <span className="hidden truncate text-[12px] text-ink-muted lg:block">{hint}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** What can be spent, with what is locked and what is in pots under it. Quiet if it cannot load. */
function MiniBalance() {
  const [wallet, setWallet] = useState<Wallet | undefined>(() => recall<Wallet>("shell:wallet"));
  const [hidden, toggle] = useHiddenBalance();

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await loadWallets();
      if (!live || result.status !== "ok" || !result.data[0]) return;
      remember("shell:wallet", result.data[0]);
      setWallet(result.data[0]);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!wallet) return null;
  const sign = SIGN[wallet.currency] ?? wallet.currency;
  const money = (value: Wallet["available"], size: "s" | "m") =>
    hidden ? <HiddenAmount sign={sign} /> : <Amount {...value} size={size} tone="hero" />;
  return (
    <section
      aria-label="Wallet balance"
      className="hero-card grid gap-3 rounded-[20px] p-4 shadow-lift"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <p className="text-[12px] font-semibold tracking-[0.04em] text-on-hero-muted uppercase">
            Available
          </p>
          <p className="font-display text-[24px] leading-8 font-bold">
            {money(wallet.available, "m")}
          </p>
        </div>
        <BalanceEye hidden={hidden} onToggle={toggle} />
      </div>
      <p className="text-[12px] text-on-hero-muted">
        Locked {money(wallet.locked, "s")} · In pots {money(wallet.savings, "s")}
      </p>
    </section>
  );
}
