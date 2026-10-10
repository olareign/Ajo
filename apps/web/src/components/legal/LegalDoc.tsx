import { FilePen } from "lucide-react";
import Link from "next/link";
import { PageIntro, PublicShell, band } from "@/components/public/PublicShell";
import { LEGAL, supportMailto } from "@/lib/support";
import { supportEmail } from "@/server/site-contact";

export type LegalSection = Readonly<{ id?: string; heading: string; body: readonly string[] }>;

/**
 * A terms or privacy page: plain-language sections, the date, how to reach us, and, until a lawyer
 * has reviewed the text, a note saying it is a draft. Sections are numbered and linkable.
 */
export async function LegalDoc({
  title,
  intro,
  sections,
}: Readonly<{ title: string; intro: string; sections: readonly LegalSection[] }>) {
  const email = await supportEmail();
  return (
    <PublicShell>
      <PageIntro kicker={`Last updated ${LEGAL.updated}`} title={title}>
        {intro}
      </PageIntro>
      <div className={`${band} grid gap-12 pb-24 lg:grid-cols-[14rem_minmax(0,46rem)]`}>
        <nav aria-label="Sections" className="hidden lg:block">
          <ol className="sticky top-24 grid gap-2 text-[14px] text-ink-muted">
            {sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#${s.id ?? `s${i + 1}`}`} className="hover:text-ink">
                  {i + 1}. {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="grid gap-8">
          {LEGAL.draft && (
            <p
              role="note"
              className="flex gap-3 rounded-[var(--radius-l)] bg-oro-tint p-4 text-[15px] leading-6 text-oro-ink"
            >
              <FilePen aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>
                <strong>Draft, under legal review.</strong> This explains how Àjọ works today in
                plain words. The final text may change before launch; we&apos;ll tell you if it
                does.
              </span>
            </p>
          )}
          {sections.map((s, i) => (
            <section
              key={s.heading}
              id={s.id ?? `s${i + 1}`}
              aria-labelledby={`h-${i + 1}`}
              className="grid scroll-mt-24 gap-3"
            >
              <h2 id={`h-${i + 1}`} className="font-display text-[22px] leading-7 font-bold">
                {i + 1}. {s.heading}
              </h2>
              {s.body.map((p) => (
                <p key={p} className="text-[16px] leading-7 text-ink-muted">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <section className="grid gap-2 rounded-[var(--radius-l)] bg-surface-raised p-5 shadow-lift">
            <h2 className="text-[16px] font-semibold">Questions</h2>
            <p className="text-[15px] leading-6 text-ink-muted">
              Email{" "}
              <a
                href={supportMailto(email, `Question about the ${title}`)}
                className="font-semibold break-all text-primary"
              >
                {email}
              </a>{" "}
              or see{" "}
              <Link href="/help" className="font-semibold text-primary">
                Help
              </Link>
              .
            </p>
          </section>
        </article>
      </div>
    </PublicShell>
  );
}
