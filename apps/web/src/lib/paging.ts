import { useState } from "react";

export const PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export type Paged<T> = Readonly<{
  /** The items on the page being shown. */
  slice: readonly T[];
  /** 1-based, always within 1..pages. */
  page: number;
  pages: number;
  size: PageSize;
  total: number;
  /** 1-based positions of the first and last item shown (0 and 0 when there are none). */
  from: number;
  to: number;
  setPage: (page: number) => void;
  setSize: (size: PageSize) => void;
}>;

/**
 * One page of a list at a time. The page stays in range as the list grows or shrinks (a filter
 * narrowing it, more arriving), and changing the page size goes back to the first page.
 */
export function usePaged<T>(items: readonly T[], initialSize: PageSize = 10): Paged<T> {
  const [size, setSizeState] = useState<PageSize>(initialSize);
  const [wanted, setPage] = useState(1);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, wanted), pages);
  const start = (page - 1) * size;
  const slice = items.slice(start, start + size);
  return {
    slice,
    page,
    pages,
    size,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
    setPage,
    setSize: (next) => {
      setSizeState(next);
      setPage(1);
    },
  };
}

/**
 * The page numbers to show: always the first and the last, the current one and its neighbours,
 * and a gap ("…") where numbers are skipped, so a long list never draws twenty buttons.
 */
export function pageNumbers(page: number, pages: number): readonly (number | "gap")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("gap");
    out.push(n);
  });
  return out;
}
