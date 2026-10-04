import { Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = Readonly<{ exitHref: string; children?: ReactNode }>;

/**
 * The strip that says a screen is a walk-through: nothing is saved, sent or charged. It stays at
 * the top while scrolling, so nobody mistakes the preview for the real thing.
 */
export function PreviewRibbon({ exitHref, children }: Props) {
  return (
    <div
      role="note"
      className="sticky top-0 z-10 -mx-4 mb-6 grid gap-2 bg-oro px-4 py-2 text-on-oro"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          <Eye aria-hidden className="size-4" />
          Preview: nothing here is saved or sent
        </p>
        <Link
          href={exitHref}
          className="shrink-0 rounded-s px-2 py-1 text-[13px] font-semibold whitespace-nowrap underline underline-offset-4"
        >
          Exit preview
        </Link>
      </div>
      {children}
    </div>
  );
}
