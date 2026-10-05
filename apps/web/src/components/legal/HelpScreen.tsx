import { ChevronDown, ChevronRight, FileText, Lock, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support";
import { InfoShell } from "./InfoShell";

/** Answers to what people ask most, each pointing at the screen that does it. */
const ANSWERS = [
  {
    q: "I lost my phone or think someone got in",
    a: "Sign in on another device, go to Me, then Sign out of all devices, and change your password. Security activity on Me lists every sign-in and change.",
  },
  {
    q: "I forgot my transaction PIN",
    a: "Go to Me, then Transaction PIN, and choose Reset. You'll need your password, and the code from your authenticator app if it's on.",
  },
  {
    q: "How do I move more money?",
    a: "Limits rise as you verify. Go to Me and tap Raise your level, or see each level under Wallet, then Your limits.",
  },
  {
    q: "A payment is missing or looks wrong",
    a: "Check Wallet for its status first. If it still looks wrong, email us with the date and amount. Never send your password, PIN or codes.",
  },
  {
    q: "How do I close my account?",
    a: "Empty your wallet, end any saving plans, wait for your circles to finish and cancel auto-debit. Then go to Me and tap Close account.",
  },
] as const;

export function HelpScreen() {
  return (
    <InfoShell title="Help" subtitle="Quick answers, and a person when you need one.">
      <div className="grid gap-6">
        <a
          href={supportMailto("Àjọ help")}
          className="flex items-center gap-4 rounded-[var(--radius-l)] bg-primary-tint p-5"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
            <Mail aria-hidden className="size-6" />
          </span>
          <span className="grid min-w-0">
            <span className="text-[16px] font-semibold">Email us</span>
            <span className="truncate text-[14px] text-ink-muted">{SUPPORT_EMAIL}</span>
          </span>
          <ChevronRight aria-hidden className="ml-auto size-5 shrink-0 text-ink-muted" />
        </a>

        <p className="flex gap-3 rounded-[var(--radius-l)] border-[1.5px] border-danger/40 bg-danger-tint p-4 text-[14px] leading-5">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
          <span>
            <strong>Àjọ will never ask for your password, PIN or authenticator codes</strong> by
            email, phone or message. Anyone who does is not us.
          </span>
        </p>

        <section aria-labelledby="answers" className="grid gap-3">
          <h2 id="answers" className="font-display text-[18px] leading-6 font-semibold">
            Quick answers
          </h2>
          <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
            {ANSWERS.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="px-4 pb-4 text-[14px] leading-[21px] text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="legal" className="grid gap-3">
          <h2 id="legal" className="font-display text-[18px] leading-6 font-semibold">
            The fine print
          </h2>
          <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-l)] bg-surface-raised shadow-lift">
            {(
              [
                ["/terms", "Terms of use", FileText],
                ["/privacy", "Privacy notice", Lock],
              ] as const
            ).map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 p-4 text-[15px] font-semibold hover:bg-surface-sunken"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                {label}
                <ChevronRight aria-hidden className="ml-auto size-5 text-ink-muted" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </InfoShell>
  );
}
