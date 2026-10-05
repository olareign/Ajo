"use client";

import { ArrowDownToLine, ArrowUpFromLine, Orbit, PiggyBank, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TabBar } from "./TabBar";

/** The top of each section: the tab bar shows here and nowhere deeper (flows keep the whole screen). */
const HOMES = ["/today", "/save", "/circles", "/friends", "/wallet", "/me", "/notifications"];

const ACTIONS = [
  {
    href: "/wallet/add",
    label: "Add money",
    Icon: ArrowDownToLine,
    tone: "bg-oro-tint text-oro-ink",
  },
  {
    href: "/wallet/withdraw",
    label: "Withdraw",
    Icon: ArrowUpFromLine,
    tone: "bg-primary-tint text-primary",
  },
  {
    href: "/save/new",
    label: "Start a savings plan",
    Icon: PiggyBank,
    tone: "bg-leaf-tint text-leaf",
  },
  {
    href: "/circles/new",
    label: "Start a circle",
    Icon: Orbit,
    tone: "bg-tertiary-tint text-tertiary",
  },
  {
    href: "/friends/invite",
    label: "Invite a friend",
    Icon: UserPlus,
    tone: "bg-primary-tint text-primary",
  },
] as const;

/** The bottom bar and its quick-actions sheet, on the top screen of each section. */
export function AppNav() {
  const path = usePathname() ?? "";
  // The screen the sheet was opened on: moving to another screen closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (next: boolean) => setOpenOn(next ? path : null);
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOn(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!HOMES.includes(path)) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close quick actions"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-actions-title"
            className="sheet-rise relative w-full max-w-md rounded-t-[var(--radius-xl)] bg-surface-raised px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-lift"
          >
            <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-line" />
            <div className="mb-4 flex items-center justify-between">
              <h2 id="quick-actions-title" className="font-display text-[20px] font-semibold">
                What would you like to do?
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-full bg-surface-sunken text-ink"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-3">
              {ACTIONS.map(({ href, label, Icon, tone }, i) => (
                <li key={href}>
                  <Link
                    ref={i === 0 ? first : undefined}
                    href={href}
                    className="grid justify-items-center gap-2 rounded-[var(--radius-l)] p-3 text-center text-[13px] leading-4 font-semibold hover:bg-surface-sunken"
                  >
                    <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
                      <Icon aria-hidden className="size-6" />
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <TabBar current={path} actionOpen={open} onAction={() => setOpen(!open)} />
    </>
  );
}
