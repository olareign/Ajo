import type { Metadata } from "next";
import Link from "next/link";
import { join } from "node:path";
import { FACTS, MISSED } from "@/components/public/facts";
import { PageIntro, PublicShell, band } from "@/components/public/PublicShell";
import { RoundPlayer } from "@/components/public/RoundPlayer";
import { listPeoplePhotos } from "@/lib/people-photos";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How an Àjọ savings circle runs: who's in it, the order of turns, deposits, what happens when someone can't pay, and saving on your own.",
};

const SETUP = [
  {
    term: "Who's in it",
    detail: `Between ${FACTS.circleSize.min} and ${FACTS.circleSize.max} people. Keep it private and share an invite code, or make it public so people saving for the same thing can find it.`,
  },
  {
    term: "How much, how often",
    detail:
      "Everyone pays the same amount, weekly, every two weeks or monthly. There are as many rounds as people, so everyone gets the pot once.",
  },
  {
    term: "Whose turn",
    detail:
      "Decided before anyone pays: a draw anyone can check, members picking their own turn, or the order people joined. Two members can agree to swap.",
  },
  {
    term: "Deposits",
    detail:
      "Someone new puts down one round's payment; an early turn asks for more, because they're paid before they've paid in much. It comes back when the circle ends. You see the exact amount before you join.",
  },
] as const;

const h2 = "font-display text-[30px] leading-tight font-bold tracking-[-0.02em] lg:text-[38px]";

export default function Page() {
  const photos = listPeoplePhotos(join(process.cwd(), "public", "people"));
  return (
    <PublicShell>
      <PageIntro kicker="How it works" title="A circle, from the first invite to the last payout.">
        The same savings circle families have always run, with Àjọ keeping track of who has paid,
        whose turn it is, and the money in between.
      </PageIntro>

      <section aria-labelledby="setup" className={`${band} grid gap-8 pb-20`}>
        <h2 id="setup" className={h2}>
          Setting one up
        </h2>
        <dl className="grid gap-px overflow-hidden rounded-[24px] border border-line bg-line md:grid-cols-2">
          {SETUP.map(({ term, detail }) => (
            <div key={term} className="grid content-start gap-2 bg-surface-raised p-6">
              <dt className="text-[17px] font-semibold">{term}</dt>
              <dd className="text-[16px] leading-7 text-ink-muted">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="rounds" className="border-y border-line bg-surface-sunken py-20">
        <div className={`${band} grid gap-8`}>
          <div className="grid max-w-2xl gap-3">
            <h2 id="rounds" className={h2}>
              Round by round
            </h2>
            <p className="text-[17px] leading-7 text-ink-muted">
              On each payment day everyone pays in, and the whole pot goes to one person. Step
              through an example circle of eight; round five shows a deposit at work.
            </p>
          </div>
          <div className="max-w-3xl">
            <RoundPlayer photos={photos} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="missed"
        className={`${band} grid gap-8 py-20 lg:grid-cols-[0.8fr_1.2fr]`}
      >
        <div className="grid content-start gap-3">
          <h2 id="missed" className={h2}>
            When someone can&apos;t pay
          </h2>
          <p className="text-[17px] leading-7 text-ink-muted">
            Life happens. This is what we do, and when, so nobody has to chase a friend.
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
      </section>

      <section aria-labelledby="solo" className="border-t border-line bg-surface-sunken py-20">
        <div className={`${band} grid max-w-3xl gap-4`}>
          <h2 id="solo" className={h2}>
            Saving on your own
          </h2>
          <p className="text-[17px] leading-7 text-ink-muted">
            A saving plan takes a set amount every day, week or month, for as many payments as you
            choose, into a pot only you can touch. You can pause it, top it up, or end it early. At
            the end, it all goes back to your wallet.
          </p>
          <Link
            href="/sign-up"
            className="mt-2 inline-flex min-h-12 w-fit items-center rounded-m bg-primary px-6 font-semibold text-on-primary hover:bg-primary-deep"
          >
            Create your account
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
