import { ArrowRight, Fingerprint, KeyRound, Laptop, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { band, PublicShell } from "./public/PublicShell";
import { FACTS, FIRST_QUESTIONS, MISSED } from "./public/facts";
import { RoundPlayer } from "./public/RoundPlayer";

const GUARDS = [
  { Icon: Fingerprint, text: "Everyone checks who they are before any money moves." },
  {
    Icon: KeyRound,
    text: "Sending money out needs your PIN and a fresh code from your authenticator app, so a stolen password alone can't move it.",
  },
  {
    Icon: Laptop,
    text: "A new device signing in gets you an email, and you can sign any device out.",
  },
  {
    Icon: Lock,
    text: "We will never ask for your password, PIN or codes. Not by phone, not by email.",
  },
] as const;

const h2 =
  "font-display text-[34px] leading-[1.1] font-bold tracking-[-0.025em] text-balance lg:text-[44px]";

/**
 * The front door on a wide screen. One idea per section, said plainly, and nothing the app can't
 * back up: every number comes from FACTS, which is checked against the API's rules.
 */
export function Landing({ photos = [] }: Readonly<{ photos?: readonly string[] }>) {
  return (
    <PublicShell>
      <section
        className={`${band} grid items-center gap-12 pt-14 pb-20 lg:grid-cols-[1fr_1.05fr] lg:pt-20`}
      >
        <div className="grid content-center gap-6">
          <p className="text-[15px] font-semibold text-primary">
            Èsúsú, ajo, adashe, susu: one idea, many names.
          </p>
          <h1 className="font-display text-[52px] leading-[1] font-bold tracking-[-0.04em] xl:text-[66px]">
            Save together, <br />
            <span className="relative inline-block text-primary">
              safely.
              <svg
                aria-hidden
                viewBox="0 0 220 14"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full text-oro"
              >
                <path
                  d="M2 9 C 50 2, 120 2, 218 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="max-w-[34rem] text-[19px] leading-8 text-ink-muted">
            Àjọ runs your savings circle for you. Everyone pays in on the same day, the whole pot
            goes to one person each round, and new members&apos; deposits cover a missed payment.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex min-h-13 items-center gap-2 rounded-m bg-primary px-6 text-[16px] font-semibold text-on-primary hover:bg-primary-deep"
            >
              Create your account
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex min-h-13 items-center rounded-m px-5 text-[16px] font-semibold text-primary hover:bg-primary-tint"
            >
              How a circle works
            </Link>
          </div>
          <p className="text-[14px] text-ink-muted">
            For people in {FACTS.countries}. Your wallet is in your own currency.
          </p>
        </div>
        <div className="rounded-[28px] border border-line bg-surface-sunken p-6 xl:p-8">
          <p className="mb-5 text-[15px] leading-6 text-ink-muted">
            <span className="font-semibold text-ink">Try one.</span> Pick what each person pays,
            then step through the rounds.
          </p>
          <RoundPlayer photos={photos} />
        </div>
      </section>

      <section aria-labelledby="missed" className="border-y border-line bg-surface-sunken py-20">
        <div className={`${band} grid gap-12 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div className="grid content-start gap-4">
            <h2 id="missed" className={h2}>
              The question everyone asks: what if someone doesn&apos;t pay?
            </h2>
            <p className="text-[17px] leading-7 text-ink-muted">
              It&apos;s why most circles end in a quarrel. Here&apos;s exactly what Àjọ does, and
              when.
            </p>
          </div>
          <ol className="grid">
            {MISSED.map((step, i) => (
              <li key={step.when} className="grid grid-cols-[7.5rem_1fr] gap-5 pb-8 last:pb-0">
                <p className="pt-0.5 font-mono text-[13px] font-semibold tracking-wide text-primary uppercase">
                  {step.when}
                </p>
                <p
                  className={`relative border-l-2 pl-6 text-[17px] leading-7 ${i === 2 ? "border-oro" : "border-line-strong"}`}
                >
                  <span
                    aria-hidden
                    className={`absolute top-1.5 -left-[7px] size-3 rounded-full ${i === 2 ? "bg-oro" : "bg-line-strong"}`}
                  />
                  {step.what}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="two-homes" className="py-20">
        <div className={`${band} grid gap-10`}>
          <h2 id="two-homes" className={`${h2} max-w-2xl`}>
            Lagos and London, in the same circle of friends.
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {[
              {
                place: "Nigeria",
                mark: "₦",
                body: "Your wallet is in naira. Add money by card, bank transfer or USSD, let your bank top you up by auto-debit, and withdraw to your own account.",
              },
              {
                place: "The UK",
                mark: "£",
                body: "Your wallet is in pounds, and you add money by card. Direct Debit top-ups and withdrawals to UK banks are still being switched on.",
              },
            ].map((home) => (
              <article
                key={home.place}
                className="relative overflow-hidden rounded-[24px] border border-line bg-surface-raised p-7"
              >
                <span
                  aria-hidden
                  className="absolute -top-6 -right-2 font-display text-[150px] leading-none font-bold text-primary-tint"
                >
                  {home.mark}
                </span>
                <h3 className="relative font-display text-[24px] font-bold">{home.place}</h3>
                <p className="relative mt-3 max-w-md text-[16px] leading-7 text-ink-muted">
                  {home.body}
                </p>
              </article>
            ))}
          </div>
          <p className="max-w-2xl text-[15px] leading-6 text-ink-muted">
            Your balance also shows roughly what it&apos;s worth in pounds, dollars and euros. That
            is an estimate to help you think, not a conversion: your money stays in its own
            currency.
          </p>
        </div>
      </section>

      <section aria-labelledby="solo" className="border-y border-line bg-surface-sunken py-20">
        <div className={`${band} grid items-center gap-10 lg:grid-cols-2`}>
          <div className="grid gap-4">
            <h2 id="solo" className={h2}>
              Saving on your own? That works too.
            </h2>
            <p className="text-[17px] leading-7 text-ink-muted">
              A saving plan takes a set amount every day, week or month, for as many payments as you
              choose, into a pot you can watch fill. Pause it when money is tight, top it up when it
              isn&apos;t, and at the end it all lands back in your wallet.
            </p>
          </div>
          <ul className="grid gap-3 text-[16px]">
            {["Rent due in March", "School fees for September", "A flight home for Christmas"].map(
              (goal, i) => (
                <li
                  key={goal}
                  className="flex items-center justify-between gap-4 rounded-[18px] bg-surface-raised px-5 py-4 shadow-lift"
                >
                  <span className="font-medium">{goal}</span>
                  <span aria-hidden className="h-2 w-28 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${[72, 40, 15][i]}%` }}
                    />
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      <section aria-labelledby="locks" className="py-20">
        <div className={`${band} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div className="grid content-start gap-4">
            <ShieldCheck aria-hidden className="size-10 text-primary" strokeWidth={1.6} />
            <h2 id="locks" className={h2}>
              Locked the way your money should be.
            </h2>
            <Link
              href="/safety"
              className="w-fit text-[16px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              Everything we do to keep it safe
            </Link>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-[24px] border border-line bg-line">
            {GUARDS.map(({ Icon, text }) => (
              <li key={text} className="flex gap-4 bg-surface-raised p-5 text-[16px] leading-7">
                <Icon aria-hidden className="mt-1 size-5 shrink-0 text-primary" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="questions" className="border-t border-line bg-surface-sunken py-20">
        <div className={`${band} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div className="grid content-start gap-4">
            <h2 id="questions" className={h2}>
              Fair questions.
            </h2>
            <Link
              href="/help"
              className="w-fit text-[16px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              More answers in Help
            </Link>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FIRST_QUESTIONS.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[18px] font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-raised text-[20px] leading-none text-primary transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-[16px] leading-7 text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="start" className="py-20">
        <div className={band}>
          <div className="hero-card grid gap-6 rounded-[32px] p-10 md:grid-cols-[1fr_auto] md:items-center lg:p-14">
            <div className="grid gap-3">
              <h2
                id="start"
                className="font-display text-[36px] leading-tight font-bold lg:text-[44px]"
              >
                Your circle, without the notebook.
              </h2>
              <p className="max-w-xl text-[17px] leading-7 text-on-hero-muted">
                Setting up takes a few minutes. Invite the people you already save with, or start a
                plan on your own.
              </p>
            </div>
            <Link
              href="/sign-up"
              className="inline-flex min-h-14 items-center gap-2 justify-self-start rounded-m bg-oro px-7 text-[16px] font-bold text-on-oro hover:brightness-105"
            >
              Create your account
              <ArrowRight aria-hidden className="size-5" />
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
