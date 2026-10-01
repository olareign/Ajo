import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type Props = Readonly<{
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  backHref?: string;
}>;

const backClass =
  "-ml-2 mb-4 inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-600";

/** Back chevron, green eyebrow ("Lets Go!") and bold question, as on every wizard screen. */
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
      {eyebrow && <p className="mb-2 text-brand-600">{eyebrow}</p>}
      <h1 className="text-xl font-bold text-ink">{title}</h1>
    </header>
  );
}
