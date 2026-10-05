import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type Props = Readonly<{
  title: string;
  eyebrow?: string;
  /** One calm line under the title saying what this screen is for. */
  subtitle?: string;
  onBack?: () => void;
  backHref?: string;
}>;

const backClass =
  "mb-5 inline-flex size-11 items-center justify-center rounded-full bg-surface-sunken text-ink transition-colors hover:bg-primary-tint";

/** Back chevron, a short label for where the person is, and the screen's question as its title. */
export function ScreenHeader({ title, eyebrow, subtitle, onBack, backHref }: Props) {
  return (
    <header className="mb-6">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Back" className={backClass}>
          <ChevronLeft aria-hidden className="size-6" />
        </button>
      )}
      {!onBack && backHref && (
        <Link href={backHref} aria-label="Back" className={backClass}>
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
      )}
      {eyebrow && (
        <p className="mb-2 text-[13px] font-semibold tracking-[0.01em] text-tertiary">{eyebrow}</p>
      )}
      <h1 className="font-display text-[28px] leading-[34px] font-bold tracking-[-0.015em] text-balance text-ink">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-[15px] leading-6 text-ink-muted">{subtitle}</p>}
    </header>
  );
}
