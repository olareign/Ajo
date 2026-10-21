"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { PAGE_SIZES, pageNumbers, type Paged, type PageSize } from "@/lib/paging";

const square =
  "grid min-h-11 min-w-11 place-items-center rounded-[12px] px-2 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The foot of every list: where you are in it, how many to show, and the pages. For a list the
 * API hands out in batches, `more` fetches the next batch when Next is pressed on the last page
 * loaded, so a person pages through everything without a separate "load more".
 */
export function Pager<T>({
  paged,
  noun,
  more,
  className,
}: Readonly<{
  paged: Paged<T>;
  /** What the list holds, singular and plural: ["payment", "payments"]. */
  noun: readonly [string, string];
  more?: Readonly<{ has: boolean; load: () => Promise<unknown> }>;
  className?: string;
}>) {
  const id = useId();
  const [loading, setLoading] = useState(false);
  const { page, pages, total, from, to } = paged;
  const canMore = Boolean(more?.has);
  const lastLoaded = page >= pages;

  async function next() {
    if (!lastLoaded) return paged.setPage(page + 1);
    if (!more || !canMore) return;
    setLoading(true);
    try {
      await more.load();
      paged.setPage(page + 1);
    } finally {
      setLoading(false);
    }
  }

  const word = total === 1 ? noun[0] : noun[1];
  const summary =
    total === 0
      ? `No ${noun[1]}`
      : `Showing ${from}–${to} of ${total}${canMore ? "+" : ""} ${word}`;

  return (
    <nav
      aria-label={`Pages of ${noun[1]}`}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 text-[13px] text-ink-muted md:px-6",
        className,
      )}
    >
      <p aria-live="polite" className="min-w-40 flex-1">
        {summary}
      </p>
      <label htmlFor={id} className="flex items-center gap-2">
        Per page
        <select
          id={id}
          value={paged.size}
          onChange={(e) => paged.setSize(Number(e.target.value) as PageSize)}
          className="min-h-11 rounded-[12px] border border-line-strong bg-surface px-2 text-[14px] text-ink"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => paged.setPage(page - 1)}
          className={cn(square, "border border-line bg-surface-raised text-ink")}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        {pageNumbers(page, pages).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} aria-hidden className="px-1">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-label={`Page ${n}`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => paged.setPage(n)}
              className={cn(
                square,
                n === page
                  ? "bg-primary text-on-primary"
                  : "border border-line bg-surface-raised text-ink hover:bg-surface-sunken",
              )}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={(lastLoaded && !canMore) || loading}
          onClick={() => void next()}
          className={cn(square, "border border-line bg-surface-raised text-ink")}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
    </nav>
  );
}
