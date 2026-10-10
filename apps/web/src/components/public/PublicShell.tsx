import type { ReactNode } from "react";
import { supportEmail } from "@/server/site-contact";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

/** Every public page: the header, the page, and the footer with the support address staff set. */
export async function PublicShell({ children }: Readonly<{ children: ReactNode }>) {
  const email = await supportEmail();
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <PublicHeader />
      <main id="main">{children}</main>
      <PublicFooter supportEmail={email} />
    </div>
  );
}

export const band = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10";

/**
 * The top of a public page: a short kicker in the page's own words, the title, and one paragraph.
 * Titles are sentences people would say, not slogans.
 */
export function PageIntro({
  kicker,
  title,
  children,
}: Readonly<{ kicker: string; title: string; children: ReactNode }>) {
  return (
    <section className={`${band} grid gap-4 pt-12 pb-10 sm:pt-16 lg:pt-20`}>
      <p className="text-[15px] font-semibold text-primary">{kicker}</p>
      <h1 className="max-w-3xl font-display text-[40px] leading-[1.05] font-bold tracking-[-0.03em] text-balance sm:text-[52px] lg:text-[60px]">
        {title}
      </h1>
      <div className="max-w-2xl text-[17px] leading-7 text-ink-muted sm:text-[19px] sm:leading-8">
        {children}
      </div>
    </section>
  );
}
