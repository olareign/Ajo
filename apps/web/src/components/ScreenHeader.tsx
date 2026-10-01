import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type Props = Readonly<{
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  backHref?: string;
}>;

const backClass =
  "-ml-2 mb-4 inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-adire-tint";

/** Back chevron, a short label for where the person is, and the screen's question as its title. */
export function ScreenHeader({ title, eyebrow, onBack, backHref }: Props) {
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
        <p className="mb-2 text-[13px] font-semibold tracking-[0.01em] text-adire">{eyebrow}</p>
      )}
      <h1 className="font-display text-[32px] leading-9 font-bold tracking-[-0.015em] text-balance text-ink">
        {title}
      </h1>
    </header>
  );
}
