import type { Metadata } from "next";
import { MISSED } from "@/components/public/facts";
import { PageIntro, PublicShell, band } from "@/components/public/PublicShell";
import { supportEmail } from "@/server/site-contact";
import { supportMailto } from "@/lib/support";

export const metadata: Metadata = {
  title: "Safety",
  description:
    "How Àjọ protects your account and your circle: identity checks, your PIN and authenticator app, deposits, and what we'll never ask you for.",
};

const ACCOUNT = [
  [
    "Everyone is who they say",
    "People check who they are before they can add, save or send money, so you know who you're in a circle with.",
  ],
  [
    "Two locks on money going out",
    "Sending money out of Àjọ needs your transaction PIN and a fresh code from your authenticator app. A stolen password alone isn't enough.",
  ],
  [
    "You see every way in",
    "A new device signing in gets you an email. Me shows every sign-in and change, and you can sign any device out, or all of them.",
  ],
  [
    "Guessing gets nowhere",
    "Too many wrong passwords and the account locks for a while, so nobody can keep trying until they get in.",
  ],
] as const;

const h2 = "font-display text-[30px] leading-tight font-bold tracking-[-0.02em] lg:text-[38px]";

export default async function Page() {
  const email = await supportEmail();
  return (
    <PublicShell>
      <PageIntro kicker="Safety" title="How we look after your money, and your account.">
        Savings circles run on trust. Àjọ backs that trust with checks, deposits and a clear record,
        so it doesn&apos;t rest on one person&apos;s memory or one person&apos;s word.
      </PageIntro>

      <section aria-labelledby="account" className={`${band} grid gap-8 pb-20`}>
        <h2 id="account" className={h2}>
          Your account
        </h2>
        <ul className="grid gap-px overflow-hidden rounded-[24px] border border-line bg-line md:grid-cols-2">
          {ACCOUNT.map(([title, body]) => (
            <li key={title} className="grid content-start gap-2 bg-surface-raised p-6">
              <h3 className="text-[17px] font-semibold">{title}</h3>
              <p className="text-[16px] leading-7 text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="circle" className="border-y border-line bg-surface-sunken py-20">
        <div className={`${band} grid gap-8 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div className="grid content-start gap-3">
            <h2 id="circle" className={h2}>
              Your circle
            </h2>
            <p className="text-[17px] leading-7 text-ink-muted">
              The order of turns is fixed before anyone pays, and everyone sees who has paid. When a
              payment doesn&apos;t arrive:
            </p>
          </div>
          <ol className="grid gap-6">
            {MISSED.map((step) => (
              <li key={step.when} className="grid gap-1 border-l-2 border-line-strong pl-5">
                <p className="font-mono text-[13px] font-semibold tracking-wide text-primary uppercase">
                  {step.when}
                </p>
                <p className="text-[16px] leading-7">{step.what}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="never" className={`${band} grid gap-6 py-20 md:grid-cols-2`}>
        <div className="grid content-start gap-3 rounded-[24px] bg-oro-tint p-7 text-oro-ink">
          <h2 id="never" className="font-display text-[26px] font-bold">
            We will never ask for
          </h2>
          <p className="text-[17px] leading-7">
            Your password, your PIN or a code from your authenticator app. Not by phone, email, text
            or chat. Anyone who asks isn&apos;t us.
          </p>
        </div>
        <div className="grid content-start gap-3 rounded-[24px] border border-line bg-surface-raised p-7">
          <h2 className="font-display text-[26px] font-bold">If something looks wrong</h2>
          <p className="text-[17px] leading-7 text-ink-muted">
            Change your password and sign out of all devices from Me, then tell us what happened.
          </p>
          <a
            href={supportMailto(email, "Something looks wrong on my account")}
            className="w-fit text-[17px] font-semibold break-all text-primary underline-offset-4 hover:underline"
          >
            {email}
          </a>
        </div>
      </section>
    </PublicShell>
  );
}
