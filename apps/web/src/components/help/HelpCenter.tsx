"use client";

import { Mail, Search, ShieldAlert } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { supportMailto } from "@/lib/support";
import type { HelpTopic } from "./help-topics";

const words = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\W+/).filter(Boolean);

/** Every word typed must appear somewhere in the question or its answer. Accents don't matter. */
function matches(query: string, q: string, a: string): boolean {
  const wanted = words(query);
  if (wanted.length === 0) return true;
  const have = words(`${q} ${a}`).join(" ");
  return wanted.every((w) => have.includes(w));
}

/** Help: answers you can search, grouped by topic, and a person when the answers aren't enough. */
export function HelpCenter({
  topics,
  supportEmail,
}: Readonly<{ topics: readonly HelpTopic[]; supportEmail: string }>) {
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const shown = topics
    .map((t) => ({ ...t, questions: t.questions.filter((f) => matches(search, f.q, f.a)) }))
    .filter((t) => t.questions.length > 0);
  const count = shown.reduce((n, t) => n + t.questions.length, 0);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="grid gap-8">
        <label className="relative block">
          <span className="sr-only">Search help</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 80))}
            placeholder="Try “deposit”, “PIN” or “withdraw”"
            className="h-14 w-full rounded-[16px] border border-line-strong bg-surface-raised pr-4 pl-12 text-[17px] outline-none placeholder:text-ink-muted focus:border-primary"
          />
        </label>
        <p role="status" className="sr-only">
          {search ? `${count} ${count === 1 ? "answer" : "answers"} found` : ""}
        </p>
        {shown.length === 0 && (
          <p className="text-[17px] leading-7 text-ink-muted">
            Nothing matches that. Try another word, or email us below and a person will answer.
          </p>
        )}
        {shown.map((topic) => (
          <section key={topic.id} aria-labelledby={`topic-${topic.id}`} className="grid gap-2">
            <h2
              id={`topic-${topic.id}`}
              className="font-display text-[24px] leading-8 font-bold tracking-[-0.01em]"
            >
              {topic.title}
            </h2>
            <div className="divide-y divide-line border-y border-line">
              {topic.questions.map(({ q, a }) => (
                <details key={q} className="group" open={search.length > 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span
                      aria-hidden
                      className="text-[22px] leading-none text-primary transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-5 text-[16px] leading-7 text-ink-muted">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-24">
        <div className="grid gap-3 rounded-[24px] bg-surface-raised p-6 shadow-lift">
          <Mail aria-hidden className="size-6 text-primary" />
          <h2 className="font-display text-[20px] font-bold">Still stuck?</h2>
          <p className="text-[15px] leading-6 text-ink-muted">
            Write to us and a person will reply. Tell us what you were doing and when, and the
            amount if it&apos;s about money.
          </p>
          <a
            href={supportMailto(supportEmail, "Àjọ help")}
            className="flex min-h-12 items-center justify-center rounded-m bg-primary px-4 text-[15px] font-semibold break-all text-on-primary hover:bg-primary-deep"
          >
            {supportEmail}
          </a>
        </div>
        <p className="flex gap-3 rounded-[20px] bg-oro-tint p-5 text-[14px] leading-5 text-oro-ink">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          Àjọ will never ask for your password, PIN or authenticator codes. If someone does, it
          isn&apos;t us.
        </p>
      </aside>
    </div>
  );
}
