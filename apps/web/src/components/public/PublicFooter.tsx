import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LEGAL } from "@/lib/support";
import { PUBLIC_LINKS } from "./links";

const band = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10";

/** The foot of every public page: where to go next, the fine print, and nothing it can't back up. */
export function PublicFooter({ supportEmail }: Readonly<{ supportEmail: string }>) {
  return (
    <footer className="border-t border-line bg-surface-sunken">
      <div className={`${band} grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]`}>
        <div className="grid content-start gap-4">
          <Logo width={92} />
          <p className="max-w-xs text-[15px] leading-6 text-ink-muted">
            The savings circle your family already knows, with the notebook, the reminders and the
            money kept for you.
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="w-fit text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            {supportEmail}
          </a>
        </div>
        <nav aria-label="Pages" className="grid content-start gap-3 text-[15px]">
          <p className="font-semibold">Àjọ</p>
          {PUBLIC_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="w-fit text-ink-muted hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Legal" className="grid content-start gap-3 text-[15px]">
          <p className="font-semibold">The fine print</p>
          <Link href="/terms" className="w-fit text-ink-muted hover:text-ink">
            Terms of use
          </Link>
          <Link href="/privacy" className="w-fit text-ink-muted hover:text-ink">
            Privacy notice
          </Link>
          <Link href="/privacy#cookies" className="w-fit text-ink-muted hover:text-ink">
            Cookies
          </Link>
        </nav>
      </div>
      <div className={`${band} border-t border-line py-6 text-[13px] leading-5 text-ink-muted`}>
        <p>
          © {new Date().getFullYear()} Àjọ.
          {LEGAL.draft && " Our terms and privacy notice are drafts while a lawyer reviews them."}
        </p>
      </div>
    </footer>
  );
}
