"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { TopBar } from "./TopBar";

type Props = Readonly<{
  title: string;
  eyebrow?: ReactNode;
  /** One calm line under the title saying what this screen is for. */
  subtitle?: string;
  onBack?: () => void;
  backHref?: string;
  /** An optional control on the right of the app bar (inner screens only). */
  action?: ReactNode;
  /**
   * A signed-in tab screen (Today, Save, Circles, Wallet, Me): the bar with your picture, support and
   * messages. Without it (sign-in, set-up) the title stands large on the page.
   */
  tab?: boolean;
  /** Tab screens: the unread count, when the screen already has it (saves asking). */
  unread?: number | null;
}>;

/** Titles longer than this read as a question for the person and stay large below the bar. */
const BAR_TITLE_MAX = 24;

const backClass =
  "grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-surface-sunken active:bg-surface-sunken";

/**
 * Tab screens: a large title. Inner screens: a slim app bar pinned to the top (back on the left, the
 * title centred, an optional action on the right) that takes a soft shadow once the page scrolls.
 * It sits just under the preview ribbon when there is one.
 */
export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  onBack,
  backHref,
  action,
  tab,
  unread,
}: Props) {
  const inner = Boolean(onBack || backHref);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!inner && tab) {
    return (
      <header className="mb-5">
        <TopBar title={title} eyebrow={eyebrow} unread={unread} scrolled={scrolled} />
        {subtitle && <p className="mt-3 text-[15px] leading-6 text-ink-muted">{subtitle}</p>}
      </header>
    );
  }

  if (!inner) {
    return (
      <header className="mb-6">
        {eyebrow && (
          <p className="mb-2 text-[13px] font-semibold tracking-[0.01em] text-tertiary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[28px] leading-[34px] font-bold tracking-[-0.015em] text-balance text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-[15px] leading-6 text-ink-muted">{subtitle}</p>}
      </header>
    );
  }

  const inBar = title.length <= BAR_TITLE_MAX;
  return (
    <header className="mb-6">
      <div
        data-app-bar=""
        data-scrolled={scrolled || undefined}
        style={{ top: "var(--app-bar-top, 0px)" }}
        className="sticky z-20 -mx-4 -mt-6 grid h-14 grid-cols-[48px_1fr_48px] items-center bg-surface/95 px-1 backdrop-blur-md transition-shadow data-[scrolled]:shadow-[0_1px_0_var(--line)]"
      >
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Back" className={backClass}>
            <ChevronLeft aria-hidden className="size-6" strokeWidth={2.25} />
          </button>
        ) : (
          <Link href={backHref!} aria-label="Back" className={backClass}>
            <ChevronLeft aria-hidden className="size-6" strokeWidth={2.25} />
          </Link>
        )}
        {inBar ? (
          <h1 className="truncate text-center font-display text-[17px] leading-6 font-semibold text-ink">
            {title}
          </h1>
        ) : (
          <span />
        )}
        <div className="grid justify-items-end">{action}</div>
      </div>
      {typeof eyebrow === "string" && eyebrow && (
        <p className="mt-4 text-[13px] font-semibold tracking-[0.01em] text-tertiary">{eyebrow}</p>
      )}
      {!inBar && (
        <h1 className="mt-4 font-display text-[24px] leading-8 font-bold tracking-[-0.01em] text-balance text-ink">
          {title}
        </h1>
      )}
      {subtitle && (
        <p
          className={`${inBar && !eyebrow ? "mt-4" : "mt-2"} text-[15px] leading-6 text-ink-muted`}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
