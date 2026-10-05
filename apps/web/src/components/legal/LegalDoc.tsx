import { FilePen } from "lucide-react";
import Link from "next/link";
import { LEGAL, SUPPORT_EMAIL, supportMailto } from "@/lib/support";
import { InfoShell } from "./InfoShell";

export type LegalSection = Readonly<{ heading: string; body: readonly string[] }>;

/**
 * A terms or privacy page: plain-language sections, the date, how to reach us, and, until a lawyer
 * has reviewed the text, a banner saying it is a draft.
 */
export function LegalDoc({
  title,
  intro,
  sections,
}: Readonly<{ title: string; intro: string; sections: readonly LegalSection[] }>) {
  return (
    <InfoShell title={title}>
      <article className="grid gap-6">
        {LEGAL.draft && (
          <p
            role="note"
            className="flex gap-3 rounded-[var(--radius-l)] bg-oro-tint p-4 text-[14px] leading-5 text-oro-ink"
          >
            <FilePen aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>
              <strong>Draft, under legal review.</strong> This explains how Àjọ works today in plain
              words. The final text may change before launch; we&apos;ll tell you if it does.
            </span>
          </p>
        )}
        <div className="grid gap-1">
          <p className="text-[13px] text-ink-muted">Last updated {LEGAL.updated}</p>
          <p className="text-[15px] leading-6">{intro}</p>
        </div>
        {sections.map((s, i) => (
          <section key={s.heading} aria-labelledby={`s${i}`} className="grid gap-2">
            <h2 id={`s${i}`} className="font-display text-[18px] leading-6 font-semibold">
              {i + 1}. {s.heading}
            </h2>
            {s.body.map((p) => (
              <p key={p} className="text-[15px] leading-6 text-ink-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
        <section className="grid gap-2 rounded-[var(--radius-l)] bg-surface-raised p-4 shadow-lift">
          <h2 className="text-[15px] font-semibold">Questions</h2>
          <p className="text-[14px] leading-5 text-ink-muted">
            Email{" "}
            <a
              href={supportMailto(`Question about the ${title}`)}
              className="font-semibold text-primary"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            or see{" "}
            <Link href="/help" className="font-semibold text-primary">
              Help
            </Link>
            .
          </p>
        </section>
      </article>
    </InfoShell>
  );
}
